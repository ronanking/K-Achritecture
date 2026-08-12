/* The on-site half of the job: capture a station, hand back the report.
 *
 * Everything lives on the phone. Stations and photos go into IndexedDB, the
 * template is cached after the first load, and generating the report never
 * touches the network — a wet well is not a good place to discover you have
 * no signal.
 */
(function () {
  "use strict";

  var schema = window.SPS_SCHEMA;
  var MAX_EDGE = 1600; // long edge, px — legible in the report, kind to storage
  var JPEG_QUALITY = 0.82;

  // -------------------------------------------------------------- storage --

  var DB_NAME = "sps-assessments";
  var DB_VERSION = 1;
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains("stations")) {
          db.createObjectStore("stations", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("photos")) {
          var photos = db.createObjectStore("photos", { keyPath: "id" });
          photos.createIndex("station", "stationId");
        }
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
    return dbPromise;
  }

  function tx(storeName, mode, run) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(storeName, mode);
        var request = run(transaction.objectStore(storeName));
        transaction.oncomplete = function () {
          resolve(request && request.result);
        };
        transaction.onerror = function () {
          reject(transaction.error);
        };
        transaction.onabort = function () {
          reject(transaction.error);
        };
      });
    });
  }

  var store = {
    allStations: function () {
      return tx("stations", "readonly", function (s) {
        return s.getAll();
      }).then(function (rows) {
        return rows.sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
      });
    },
    getStation: function (id) {
      return tx("stations", "readonly", function (s) {
        return s.get(id);
      });
    },
    putStation: function (station) {
      station.updatedAt = Date.now();
      return tx("stations", "readwrite", function (s) {
        return s.put(station);
      }).then(function () {
        return station;
      });
    },
    deleteStation: function (id) {
      return store.photosFor(id).then(function (photos) {
        return Promise.all(
          photos.map(function (photo) {
            return store.deletePhoto(photo.id);
          })
        ).then(function () {
          return tx("stations", "readwrite", function (s) {
            return s.delete(id);
          });
        });
      });
    },
    photosFor: function (stationId) {
      return tx("photos", "readonly", function (s) {
        return s.index("station").getAll(stationId);
      }).then(function (rows) {
        return rows.sort(function (a, b) {
          return a.createdAt - b.createdAt;
        });
      });
    },
    putPhoto: function (photo) {
      return tx("photos", "readwrite", function (s) {
        return s.put(photo);
      });
    },
    deletePhoto: function (id) {
      return tx("photos", "readwrite", function (s) {
        return s.delete(id);
      });
    },
    getCached: function (key) {
      return tx("cache", "readonly", function (s) {
        return s.get(key);
      });
    },
    setCached: function (key, value) {
      return tx("cache", "readwrite", function (s) {
        return s.put({ key: key, value: value });
      });
    },
  };

  // ------------------------------------------------------------- template --

  /* Fetch once, keep forever. After the first successful load the report can
   * be generated with the phone in aeroplane mode. */
  function loadTemplate() {
    return store.getCached("template").then(function (hit) {
      if (hit && hit.value && hit.value.byteLength) return hit.value;
      return fetch("template.docx", { cache: "force-cache" })
        .then(function (response) {
          if (!response.ok) throw new Error("template.docx returned " + response.status);
          return response.arrayBuffer();
        })
        .then(function (buffer) {
          return store.setCached("template", buffer).then(function () {
            return buffer;
          });
        });
    });
  }

  // ---------------------------------------------------------------- model --

  var fieldsById = Object.create(null);
  var sectionsById = Object.create(null);
  var conditionSection = null;
  var photoSection = null;

  schema.sections.forEach(function (section) {
    sectionsById[section.id] = section;
    (section.fields || []).forEach(function (field) {
      fieldsById[field.id] = field;
    });
    if (section.kind === "condition") conditionSection = section;
    if (section.kind === "photos") photoSection = section;
  });

  // Names and dates that stay the same from one station to the next.
  var CARRY_OVER = [
    "doc_number", "doc_version", "doc_status",
    "sign_prepared_by_name", "sign_reviewed_by_name",
    "sign_reviewed_by_2_name", "sign_approved_by_name",
  ];

  function newStation(seed) {
    var values = {};
    schema.sections.forEach(function (section) {
      (section.fields || []).forEach(function (field) {
        if (field.default) values[field.id] = field.default;
      });
    });
    if (seed) {
      CARRY_OVER.forEach(function (id) {
        if (seed.values[id]) values[id] = seed.values[id];
      });
    }
    values.report_date = values.report_date || today();
    return {
      id: "st_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      values: values,
    };
  }

  function today() {
    var now = new Date();
    return [
      String(now.getDate()).padStart(2, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      now.getFullYear(),
    ].join("/");
  }

  function toIsoDate(value) {
    var parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
    return parts ? parts[3] + "-" + parts[2] + "-" + parts[1] : "";
  }

  function fromIsoDate(value) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    return parts ? parts[3] + "/" + parts[2] + "/" + parts[1] : value;
  }

  function stationName(station) {
    return String(station.values.sps_id || "").trim() || "Unnamed station";
  }

  function isFilled(value) {
    return String(value == null ? "" : value).trim().length > 0;
  }

  /* How much of a section is done, for the tallies on the section chips. */
  function progressOf(station, section, photoCounts) {
    var done = 0;
    var total = 0;
    if (section.kind === "condition") {
      section.assets.forEach(function (asset) {
        total += 1;
        if (isFilled(station.values[asset.id + "_rating"])) done += 1;
      });
    } else if (section.kind === "photos") {
      section.groups.forEach(function (group) {
        total += 1;
        if (photoCounts[group.id]) done += 1;
      });
    } else {
      (section.fields || []).forEach(function (field) {
        total += 1;
        if (field.type === "image") {
          if (photoCounts[field.id]) done += 1;
        } else if (isFilled(station.values[field.id])) {
          done += 1;
        }
      });
    }
    return { done: done, total: total };
  }

  function overallProgress(station, photoCounts) {
    var done = 0;
    var total = 0;
    schema.sections.forEach(function (section) {
      var part = progressOf(station, section, photoCounts);
      done += part.done;
      total += part.total;
    });
    return { done: done, total: total, ratio: total ? done / total : 0 };
  }

  // ----------------------------------------------------------- the walk-through --

  var stages = schema.stages || [{ id: "field", label: "On site" }];

  function sectionsInStage(stageId) {
    return schema.sections.filter(function (section) {
      return (section.stage || "field") === stageId;
    });
  }

  /* One flat, ordered list of everything that needs an answer in a stage.
   *
   * Focus mode walks this: a field, a rated asset, or a photo group is one
   * screen each. The scrolling list renders the same things grouped by
   * section — same items, same order, two ways of looking at them. */
  function itemsInStage(stageId) {
    var items = [];
    sectionsInStage(stageId).forEach(function (section) {
      (section.fields || []).forEach(function (field) {
        items.push({ kind: "field", section: section, field: field, id: field.id });
      });
      (section.assets || []).forEach(function (asset) {
        items.push({ kind: "asset", section: section, asset: asset, id: asset.id });
      });
      (section.groups || []).forEach(function (group) {
        items.push({ kind: "group", section: section, group: group, id: group.id });
      });
    });
    return items;
  }

  function itemLabel(item) {
    if (item.kind === "asset") return item.asset.label;
    if (item.kind === "group") return item.group.label;
    return item.field.column
      ? item.field.label + " — " + item.field.column
      : item.field.label;
  }

  function itemAnswered(item, counts) {
    counts = counts || photoCounts();
    if (item.kind === "asset") {
      return isFilled(current.station.values[item.asset.id + "_rating"]);
    }
    if (item.kind === "group") return !!counts[item.group.id];
    if (item.field.type === "image") return !!counts[item.field.id];
    return isFilled(current.station.values[item.field.id]);
  }

  function stageProgress(stageId) {
    var counts = photoCounts();
    var items = itemsInStage(stageId);
    var done = items.filter(function (item) {
      return itemAnswered(item, counts);
    }).length;
    return { done: done, total: items.length, items: items };
  }

  /* Where to drop someone who taps Resume: the first thing still unanswered,
   * or the start if the stage is finished. */
  function firstUnanswered(items) {
    var counts = photoCounts();
    for (var i = 0; i < items.length; i++) {
      if (!itemAnswered(items[i], counts)) return i;
    }
    return 0;
  }

  // ---------------------------------------------------------------- photos --

  /* Shrink to a sane long edge and re-encode as JPEG.
   *
   * A modern iPhone shot is 12 megapixels of HEIC; thirty of those would make
   * a report nobody can email. This also normalises HEIC to something Word
   * understands, and bakes in the EXIF rotation so pictures are not sideways
   * on the page. */
  function prepareImage(file) {
    return decode(file).then(function (source) {
      var scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
      var width = Math.max(1, Math.round(source.width * scale));
      var height = Math.max(1, Math.round(source.height * scale));

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext("2d");
      context.drawImage(source, 0, 0, width, height);
      if (source.close) source.close();

      return new Promise(function (resolve, reject) {
        canvas.toBlob(
          function (blob) {
            if (!blob) return reject(new Error("Could not read that image."));
            resolve({ blob: blob, width: width, height: height });
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      });
    });
  }

  function decode(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(decodeViaImg);
    }
    return decodeViaImg();

    function decodeViaImg() {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error("That file is not an image the browser can read."));
        };
        img.src = url;
      });
    }
  }

  // The two hidden file inputs are shared; whoever opened one owns the result.
  var pendingCapture = null;

  function wirePickers() {
    ["camera", "library"].forEach(function (id) {
      var input = document.getElementById(id);
      input.addEventListener("change", function () {
        var files = Array.prototype.slice.call(input.files || []);
        input.value = "";
        if (!files.length || !pendingCapture) return;
        var target = pendingCapture;
        pendingCapture = null;
        addPhotos(target, files);
      });
    });
  }

  function pickPhotos(group, useCamera) {
    pendingCapture = group;
    document.getElementById(useCamera ? "camera" : "library").click();
  }

  function addPhotos(group, files) {
    // A figure — the GIS overview, the SCADA diagram — is one image, not a
    // gallery. Take the first and let it replace whatever was there.
    var single = fieldsById[group] && fieldsById[group].type === "image";
    if (single) files = files.slice(0, 1);

    toast(files.length > 1 ? "Adding " + files.length + " photos…" : "Adding photo…");
    var chain = single
      ? Promise.all(
          photosIn(group).map(function (photo) {
            return store.deletePhoto(photo.id);
          })
        )
      : Promise.resolve();

    files.forEach(function (file) {
      chain = chain
        .then(function () {
          return prepareImage(file);
        })
        .then(function (image) {
          return store.putPhoto({
            id: "ph_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
            stationId: current.station.id,
            group: group,
            note: "",
            blob: image.blob,
            width: image.width,
            height: image.height,
            createdAt: Date.now(),
          });
        });
    });
    chain
      .then(function () {
        return refreshPhotos();
      })
      .then(function () {
        renderKeepingScroll();
        toast(files.length > 1 ? files.length + " photos added" : "Photo added");
      })
      .catch(function (error) {
        toast(error.message || "Could not add that photo");
      });
  }

  // ----------------------------------------------------------------- state --

  var current = {
    view: "list",
    station: null,
    photos: [],
    sectionId: "__walk",
    stage: "field",
    focus: null, // {index, jumping} while stepping one question at a time
    stations: [],
    counts: Object.create(null), // station id -> group id -> photo count
  };

  var objectUrls = [];

  function thumbUrl(photo) {
    var url = URL.createObjectURL(photo.blob);
    objectUrls.push(url);
    return url;
  }

  function releaseUrls() {
    objectUrls.forEach(URL.revokeObjectURL);
    objectUrls = [];
  }

  function photoCounts() {
    var counts = Object.create(null);
    current.photos.forEach(function (photo) {
      counts[photo.group] = (counts[photo.group] || 0) + 1;
    });
    return counts;
  }

  function photosIn(group) {
    return current.photos.filter(function (photo) {
      return photo.group === group;
    });
  }

  function refreshPhotos() {
    return store.photosFor(current.station.id).then(function (rows) {
      current.photos = rows;
    });
  }

  // --------------------------------------------------------------- helpers --

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === "class") node.className = props[key];
      else if (key === "text") node.textContent = props[key];
      else if (key === "html") node.innerHTML = props[key];
      else if (key.slice(0, 2) === "on") node.addEventListener(key.slice(2), props[key]);
      else if (props[key] === true) node.setAttribute(key, "");
      else if (props[key] !== false && props[key] != null) node.setAttribute(key, props[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  var toastTimer = null;

  function toast(message) {
    var node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove("show");
    }, 2400);
  }

  var saveTimer = null;

  function setValue(id, value) {
    current.station.values[id] = value;
    updateProgressChrome();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      store.putStation(current.station).catch(function () {
        toast("Could not save — the phone may be out of storage");
      });
    }, 350);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    // Nothing open means nothing to save — and after a delete, writing here
    // would put the station straight back.
    if (!current.station) return Promise.resolve();
    return store.putStation(current.station);
  }

  function autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + 2 + "px";
  }

  function isInstalled() {
    return (
      window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
    );
  }

  /* Ask the browser not to evict the database. Safari clears site data after
   * about a week of no visits unless the site is installed or granted this,
   * and a fortnight of inspections is exactly the thing that would go. */
  function requestDurableStorage() {
    if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
    return navigator.storage.persisted
      ? navigator.storage.persisted().then(function (already) {
          return already || navigator.storage.persist();
        })
      : navigator.storage.persist();
  }

  function relativeDay(timestamp) {
    var days = Math.floor((Date.now() - timestamp) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    return new Date(timestamp).toLocaleDateString("en-AU");
  }

  // ------------------------------------------------------------- rendering --

  var app = document.getElementById("app");
  var titleNode = document.getElementById("title");
  var subtitleNode = document.getElementById("subtitle");
  var backButton = document.getElementById("back");
  var topAction = document.getElementById("topaction");
  var sectionBar = document.getElementById("sectionbar");

  function render() {
    releaseUrls();
    app.textContent = "";
    if (current.view === "list") renderList();
    else renderStation();
  }

  /* Photographing asset 22 of 29 must not throw you back to asset 1. */
  function renderKeepingScroll() {
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  // -- station list ---------------------------------------------------------

  function renderList() {
    backButton.classList.add("hidden");
    topAction.classList.add("hidden");
    sectionBar.classList.add("hidden");
    titleNode.firstChild.textContent = "SPS assessments";
    subtitleNode.textContent = current.stations.length
      ? current.stations.length + (current.stations.length === 1 ? " station" : " stations") + " on this phone"
      : "Nothing captured yet";

    app.appendChild(
      el("button", {
        class: "bigbtn",
        type: "button",
        text: "+ New station",
        onclick: function () {
          var seed = current.stations[0];
          var station = newStation(seed);
          store.putStation(station).then(function () {
            openStation(station.id);
            if (seed) toast("Carried over the names from " + stationName(seed));
          });
        },
      })
    );

    if (!current.stations.length) {
      app.appendChild(
        el("p", {
          class: "empty",
          text:
            "Start a station, fill it in as you walk the site, then generate the Word report when you are done.",
        })
      );
      renderFooterTools();
      return;
    }

    var list = el("ul", { class: "stationlist" });
    current.stations.forEach(function (station) {
      var counts = current.counts[station.id] || {};
      var progress = overallProgress(station, counts);
      var shots = Object.keys(counts).reduce(function (total, key) {
        return total + counts[key];
      }, 0);
      var rated = conditionSection.assets.filter(function (asset) {
        return isFilled(station.values[asset.id + "_rating"]);
      }).length;

      list.appendChild(
        el("li", {}, [
          el(
            "a",
            {
              href: "#" + station.id,
              onclick: function (event) {
                event.preventDefault();
                openStation(station.id);
              },
            },
            [
              el("div", { class: "name", text: stationName(station) }),
              el("div", {
                class: "meta",
                text:
                  rated + " of " + conditionSection.assets.length + " assets rated · " +
                  shots + (shots === 1 ? " photo" : " photos") + " · edited " +
                  relativeDay(station.updatedAt),
              }),
              el("div", { class: "bar" }, [
                el("i", { style: "width:" + Math.round(progress.ratio * 100) + "%" }),
              ]),
            ]
          ),
        ])
      );
    });
    app.appendChild(list);
    renderFooterTools();
  }

  function renderFooterTools() {
    if (!isInstalled()) {
      app.appendChild(
        el("div", { class: "card" }, [
          el("h3", { text: "Add this to your home screen" }),
          el("p", {
            class: "note",
            text:
              "Share → Add to Home Screen. It then opens like an app, works with no signal, " +
              "and — the part that matters — iOS stops clearing the saved stations after a week " +
              "of not opening it.",
          }),
        ])
      );
    }

    app.appendChild(
      el("div", { class: "card" }, [
        el("h3", { text: "Backup" }),
        el("p", {
          class: "note",
          text:
            "Everything is stored on this phone only. Export writes a single file with all stations and photos in it, which you can import again here or on another device.",
        }),
        el("div", { class: "rowactions" }, [
          el("button", {
            class: "iconbtn",
            type: "button",
            text: "Export all",
            onclick: exportAll,
          }),
          el("button", {
            class: "iconbtn",
            type: "button",
            text: "Import",
            onclick: importAll,
          }),
        ]),
      ])
    );
  }

  // -- one station ----------------------------------------------------------

  function openStation(id) {
    return store.getStation(id).then(function (station) {
      current.station = station;
      current.view = "station";
      current.sectionId = "__walk";
      current.stage = "field";
      current.focus = null;
      return refreshPhotos().then(function () {
        window.scrollTo(0, 0);
        render();
      });
    });
  }

  function backToList() {
    // Back out of focus mode first — the arrow means "up one level", not
    // "abandon the station".
    if (current.focus) return Promise.resolve(exitFocus());
    return saveNow()
      .then(loadStations)
      .then(function () {
        current.view = "list";
        current.station = null;
        current.photos = [];
        document.body.classList.remove("focusing");
        window.scrollTo(0, 0);
        render();
      });
  }

  function renderStation() {
    var station = current.station;

    backButton.classList.remove("hidden");
    titleNode.firstChild.textContent = stationName(station);

    // Focus mode takes the whole screen — no chips, no report shortcut, one
    // question and the two buttons that move you off it.
    if (current.focus) {
      topAction.classList.add("hidden");
      sectionBar.classList.add("hidden");
      document.body.classList.add("focusing");
      return renderFocus();
    }

    document.body.classList.remove("focusing");
    topAction.classList.remove("hidden");
    sectionBar.classList.remove("hidden");

    renderSectionBar();
    updateProgressChrome();

    if (current.sectionId === "__report") return renderReport();
    if (current.sectionId === "__walk") return renderWalkthrough();

    var section = sectionsById[current.sectionId];
    app.appendChild(el("h2", { class: "section", text: section.title }));
    if (section.hint) app.appendChild(el("p", { class: "lede", text: section.hint }));

    if (section.kind === "condition") renderCondition(section);
    else if (section.kind === "photos") renderPhotoGroups(section);
    else renderFields(section);
  }

  // -- the walk-through index -----------------------------------------------

  /* The landing screen for a station: which stage you are in, one button that
   * puts you back where you stopped, and the sections as an index rather than
   * a wall of inputs. */
  function renderWalkthrough() {
    var tabs = el("div", { class: "stagetabs" });
    stages.forEach(function (stage) {
      var progress = stageProgress(stage.id);
      tabs.appendChild(
        el(
          "button",
          {
            class: "stagetab",
            type: "button",
            "aria-pressed": String(stage.id === current.stage),
            onclick: function () {
              current.stage = stage.id;
              render();
            },
          },
          [
            el("span", { class: "stagename", text: stage.label }),
            el("span", { class: "stagecount", text: progress.done + " / " + progress.total }),
          ]
        )
      );
    });
    app.appendChild(tabs);

    var stage = stages.filter(function (s) {
      return s.id === current.stage;
    })[0];
    var progress = stageProgress(current.stage);
    if (stage && stage.hint) app.appendChild(el("p", { class: "lede", text: stage.hint }));

    var startAt = firstUnanswered(progress.items);
    var complete = progress.done === progress.total;
    var next = progress.items[startAt];

    app.appendChild(
      el(
        "button",
        {
          class: "bigbtn walkbtn",
          type: "button",
          onclick: function () {
            enterFocus(startAt);
          },
        },
        [
          el("span", {
            class: "walkverb",
            text: complete
              ? "Go through it again"
              : progress.done
                ? "Resume"
                : "Start",
          }),
          el("span", {
            class: "walknext",
            text: complete
              ? progress.total + " of " + progress.total + " answered"
              : "next: " + itemLabel(next) + " · " + (startAt + 1) + " of " + progress.total,
          }),
        ]
      )
    );

    var index = el("div", { class: "card sectionindex" });
    sectionsInStage(current.stage).forEach(function (section) {
      var part = progressOf(current.station, section, photoCounts());
      var offset = progress.items.findIndex(function (item) {
        return item.section.id === section.id;
      });
      index.appendChild(
        el(
          "button",
          {
            class: "indexrow",
            type: "button",
            onclick: function () {
              enterFocus(offset < 0 ? 0 : offset);
            },
          },
          [
            el("span", {
              class: "mark " + (part.done === part.total ? "ok" : "todo"),
              text: part.done === part.total ? "✓" : "·",
            }),
            el("span", { class: "indexname", text: section.title }),
            el("span", { class: "count", text: part.done + "/" + part.total }),
          ]
        )
      );
    });
    app.appendChild(index);

    app.appendChild(
      el("p", {
        class: "note",
        text:
          "One question at a time, swipe or tap to move. Anything you skip stays " +
          "blank in the report, so you can walk the site in whatever order suits it.",
      })
    );
  }

  // -- focus mode -----------------------------------------------------------

  function enterFocus(index) {
    var items = itemsInStage(current.stage);
    current.focus = { index: Math.max(0, Math.min(index, items.length - 1)) };
    window.scrollTo(0, 0);
    render();
  }

  function exitFocus() {
    current.focus = null;
    current.sectionId = "__walk";
    window.scrollTo(0, 0);
    render();
  }

  function stepFocus(delta) {
    var items = itemsInStage(current.stage);
    var next = current.focus.index + delta;
    if (next < 0) return;
    if (next >= items.length) return exitFocus();
    current.focus.index = next;
    // Blur first, or iOS keeps the keyboard up over the next question.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
    render();
  }

  function renderFocus() {
    var items = itemsInStage(current.stage);
    var index = Math.min(current.focus.index, items.length - 1);
    var item = items[index];
    if (!item) return exitFocus();

    var screen = el("div", { class: "focus" });

    // -- header: where you are, and the way out
    var counts = photoCounts();
    var done = items.filter(function (each) {
      return itemAnswered(each, counts);
    }).length;

    screen.appendChild(
      el("div", { class: "focushead" }, [
        el("button", {
          class: "focusexit",
          type: "button",
          "aria-label": "Leave focus mode",
          text: "✕",
          onclick: exitFocus,
        }),
        el("div", { class: "focuswhere" }, [
          el("span", { class: "focussection", text: item.section.title }),
          (focusCountNode = el("span", {
            class: "focuscount",
            text: index + 1 + " of " + items.length + " · " + done + " answered",
          })),
        ]),
        el("button", {
          class: "focusexit",
          type: "button",
          "aria-label": "Jump to another question",
          text: "☰",
          onclick: function () {
            current.focus.jumping = true;
            render();
          },
        }),
      ])
    );

    var bar = el("div", { class: "focusbar" });
    bar.appendChild(
      el("i", { style: "width:" + Math.round(((index + 1) / items.length) * 100) + "%" })
    );
    screen.appendChild(bar);

    if (current.focus.jumping) {
      screen.appendChild(renderJumpList(items, index));
      app.appendChild(screen);
      return;
    }

    // -- the one question
    var body = el("div", { class: "focusbody", "data-rating": "" });
    body.appendChild(el("h2", { class: "focusq", text: itemLabel(item) }));

    if (item.kind === "asset") {
      body.setAttribute("data-rating", current.station.values[item.asset.id + "_rating"] || "");
      body.appendChild(
        el("p", { class: "focushint", text: "How would you rate its condition?" })
      );
      assetControls(item.asset, body).forEach(function (node) {
        body.appendChild(node);
      });
    } else if (item.kind === "group") {
      body.appendChild(
        el("p", { class: "focushint", text: "Photograph it for Appendix 1." })
      );
      body.appendChild(renderShots(item.group.id, item.group.label));
    } else {
      if (item.field.help) {
        body.appendChild(el("p", { class: "focushint", text: item.field.help }));
      }
      var field = renderField(item.field);
      // The label is already the question, in full size, above.
      var label = field.querySelector("label");
      if (label) field.removeChild(label);
      body.appendChild(field);
    }

    screen.appendChild(body);

    // -- thumb bar
    screen.appendChild(
      el("div", { class: "focusnav" }, [
        el("button", {
          class: "navbtn",
          type: "button",
          text: "‹ Back",
          disabled: index === 0,
          onclick: function () {
            stepFocus(-1);
          },
        }),
        el("button", {
          class: "navbtn primary",
          type: "button",
          text: index === items.length - 1 ? "Done" : "Next ›",
          onclick: function () {
            stepFocus(1);
          },
        }),
      ])
    );

    wireSwipe(screen);
    app.appendChild(screen);
  }

  function renderJumpList(items, currentIndex) {
    var counts = photoCounts();
    var list = el("div", { class: "focusjump" });
    var lastSection = null;

    items.forEach(function (item, i) {
      if (item.section.id !== lastSection) {
        lastSection = item.section.id;
        list.appendChild(el("h3", { class: "jumpsection", text: item.section.title }));
      }
      var answered = itemAnswered(item, counts);
      list.appendChild(
        el(
          "button",
          {
            class: "jumprow",
            type: "button",
            "aria-current": String(i === currentIndex),
            onclick: function () {
              current.focus.jumping = false;
              current.focus.index = i;
              render();
            },
          },
          [
            el("span", { class: "mark " + (answered ? "ok" : "todo"), text: answered ? "✓" : "·" }),
            el("span", { class: "jumpname", text: itemLabel(item) }),
            el("span", { class: "count", text: String(i + 1) }),
          ]
        )
      );
    });
    return list;
  }

  /* Swipe between questions. Ignored when the gesture starts on something the
   * finger is meant to be doing something else with — a text box being
   * scrolled, the photo strip being panned. */
  function wireSwipe(node) {
    var startX = 0;
    var startY = 0;
    var tracking = false;

    node.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) return;
        var target = event.target;
        if (target.closest("textarea, input, .shots, .focusjump")) return;
        tracking = true;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
      },
      { passive: true }
    );

    node.addEventListener(
      "touchend",
      function (event) {
        if (!tracking) return;
        tracking = false;
        var touch = event.changedTouches[0];
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        stepFocus(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  var tallyNodes = Object.create(null);
  var focusCountNode = null;

  function renderSectionBar() {
    sectionBar.textContent = "";
    tallyNodes = Object.create(null);
    var counts = photoCounts();

    var chips = [{ id: "__walk", title: "Walk-through" }]
      .concat(sectionsInStage(current.stage))
      .concat([{ id: "__report", title: "Report" }]);

    chips.forEach(function (section) {
      var chip = el("button", {
        class: "chip",
        type: "button",
        "aria-current": String(section.id === current.sectionId),
        onclick: function () {
          current.sectionId = section.id;
          window.scrollTo(0, 0);
          render();
        },
      });
      chip.appendChild(document.createTextNode(section.title));
      if (section.id !== "__report" && section.id !== "__walk") {
        var part = progressOf(current.station, section, counts);
        var tally = el("span", { class: "tally", text: part.done + "/" + part.total });
        tallyNodes[section.id] = tally;
        chip.appendChild(tally);
      }
      sectionBar.appendChild(chip);
    });

    var active = sectionBar.querySelector('[aria-current="true"]');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  // -- plain field sections -------------------------------------------------

  function renderFields(section) {
    var container = el("div", { class: section.columns ? "card grid2" : "card" });
    section.fields.forEach(function (field) {
      container.appendChild(renderField(field));
    });
    app.appendChild(container);
  }

  function renderField(field) {
    var value = current.station.values[field.id] || "";
    var wrap = el("div", { class: "field" + (isFilled(value) ? " filled" : "") });
    var label = el("label", { for: "f_" + field.id });
    label.appendChild(
      document.createTextNode(field.column ? field.label + " — " + field.column : field.label)
    );
    if (field.help) label.appendChild(el("span", { class: "help", text: field.help }));
    wrap.appendChild(label);

    if (field.type === "image") {
      wrap.appendChild(renderImageField(field));
      return wrap;
    }

    var input;
    if (field.type === "textarea" || field.type === "lines") {
      input = el("textarea", {
        id: "f_" + field.id,
        rows: field.type === "lines" ? 4 : 2,
        placeholder: field.type === "lines" ? "One item per line" : field.placeholder || "",
      });
      input.value = value;
      input.addEventListener("input", function () {
        autoGrow(input);
        setValue(field.id, input.value);
        wrap.classList.toggle("filled", isFilled(input.value));
      });
      requestAnimationFrame(function () {
        autoGrow(input);
      });
    } else if (field.type === "date") {
      input = el("input", { id: "f_" + field.id, type: "date" });
      input.value = toIsoDate(value);
      input.addEventListener("change", function () {
        setValue(field.id, fromIsoDate(input.value));
        wrap.classList.toggle("filled", isFilled(input.value));
      });
    } else {
      input = el("input", {
        id: "f_" + field.id,
        type: "text",
        placeholder: field.placeholder || "",
        inputmode: field.inputMode || false,
        autocapitalize: "sentences",
      });
      input.value = value;
      input.addEventListener("input", function () {
        setValue(field.id, input.value);
        wrap.classList.toggle("filled", isFilled(input.value));
        if (field.id === "sps_id") {
          titleNode.firstChild.textContent = stationName(current.station);
        }
      });
    }

    if (field.choices) {
      var picks = el("div", { class: "quickpicks" });
      field.choices.forEach(function (choice) {
        var button = el("button", {
          class: "quickpick",
          type: "button",
          text: choice,
          "aria-pressed": String(value === choice),
          onclick: function () {
            var next = input.value === choice ? "" : choice;
            input.value = next;
            setValue(field.id, next);
            wrap.classList.toggle("filled", isFilled(next));
            picks.querySelectorAll(".quickpick").forEach(function (other) {
              other.setAttribute("aria-pressed", String(other.textContent === next));
            });
          },
        });
        picks.appendChild(button);
      });
      wrap.appendChild(picks);
    }

    wrap.appendChild(input);
    return wrap;
  }

  function renderImageField(field) {
    var wrap = el("div", {});
    var existing = photosIn(field.id)[0];
    if (existing) {
      wrap.appendChild(el("img", { class: "figure", src: thumbUrl(existing), alt: field.label }));
      wrap.appendChild(
        el("div", { class: "rowactions" }, [
          el("button", {
            class: "textbtn danger",
            type: "button",
            text: "Remove image",
            onclick: function () {
              store.deletePhoto(existing.id).then(refreshPhotos).then(renderKeepingScroll);
            },
          }),
        ])
      );
    } else {
      wrap.appendChild(
        el("div", { class: "rowactions" }, [
          el("button", {
            class: "iconbtn",
            type: "button",
            text: "Choose image",
            onclick: function () {
              pickPhotos(field.id, false);
            },
          }),
        ])
      );
    }
    return wrap;
  }

  // -- the condition table --------------------------------------------------

  function renderCondition(section) {
    var rated = section.assets.filter(function (asset) {
      return isFilled(current.station.values[asset.id + "_rating"]);
    }).length;

    app.appendChild(
      el("div", { class: "banner" + (rated === section.assets.length ? " good" : "") }, [
        el("span", {
          text:
            rated + " of " + section.assets.length + " rated." +
            (rated === section.assets.length ? " All done." : " Unrated assets are left blank in the report."),
        }),
      ])
    );

    section.assets.forEach(function (asset, i) {
      app.appendChild(renderAsset(asset, i, section.assets.length));
    });
  }

  function renderAsset(asset, index, total) {
    var card = el("div", {
      class: "card assetcard",
      "data-rating": current.station.values[asset.id + "_rating"] || "",
    });
    card.appendChild(
      el("h3", {}, [
        el("span", { text: asset.label }),
        el("span", { class: "idx", text: index + 1 + "/" + total }),
      ])
    );
    assetControls(asset, card).forEach(function (node) {
      card.appendChild(node);
    });
    return card;
  }

  /* The rating buttons, the plain-English meaning, the comment and the photo
   * strip. Shared by the scrolling list and by focus mode, which lays the same
   * controls out one to a screen. `host` gets the data-rating attribute that
   * colours the surround. */
  function assetControls(asset, host) {
    var values = current.station.values;
    var ratingId = asset.id + "_rating";
    var commentId = asset.id + "_comment";

    var meaning = el("p", { class: "ratingmeaning" });
    function describe(value) {
      meaning.textContent = "";
      var rating = schema.ratings.filter(function (r) {
        return r.value === value;
      })[0];
      if (!rating) {
        meaning.textContent = "Not rated yet.";
        return;
      }
      meaning.appendChild(el("b", { text: rating.value + " — " + rating.label + ". " }));
      meaning.appendChild(document.createTextNode(rating.other + "."));
    }

    var ratings = el("div", { class: "ratings" });
    schema.ratings.forEach(function (rating) {
      ratings.appendChild(
        el("button", {
          class: "rating",
          type: "button",
          "data-value": rating.value,
          "aria-pressed": String(values[ratingId] === rating.value),
          "aria-label": rating.value + " — " + rating.label,
          text: rating.value,
          onclick: function () {
            var next = values[ratingId] === rating.value ? "" : rating.value;
            setValue(ratingId, next);
            host.setAttribute("data-rating", next);
            ratings.querySelectorAll(".rating").forEach(function (button) {
              button.setAttribute(
                "aria-pressed",
                String(button.getAttribute("data-value") === next)
              );
            });
            describe(next);
          },
        })
      );
    });
    describe(values[ratingId] || "");

    var comment = el("textarea", {
      rows: 2,
      placeholder: "What you can see — defects, extent, why it rates that way",
      "aria-label": asset.label + " comment",
    });
    comment.value = values[commentId] || "";
    comment.addEventListener("input", function () {
      autoGrow(comment);
      setValue(commentId, comment.value);
    });
    requestAnimationFrame(function () {
      autoGrow(comment);
    });

    return [
      ratings,
      meaning,
      el("div", { class: "field" }, [comment]),
      renderShots(asset.id, asset.label),
    ];
  }

  /* Rating an asset or typing in a field deliberately does not re-render — the
   * page would jump back to the top mid-inspection. So the counters that live
   * outside the card being edited are nudged by hand instead. */
  function updateProgressChrome() {
    if (!current.station || current.view !== "station") return;
    var counts = photoCounts();

    if (current.focus) {
      // Answering the question on screen should move the counter above it.
      var items = itemsInStage(current.stage);
      var done = items.filter(function (each) {
        return itemAnswered(each, counts);
      }).length;
      if (focusCountNode) {
        focusCountNode.textContent =
          current.focus.index + 1 + " of " + items.length + " · " + done + " answered";
      }
      return;
    }

    var progress = overallProgress(current.station, counts);
    subtitleNode.textContent =
      progress.done + " of " + progress.total + " filled · saved automatically";
    Object.keys(tallyNodes).forEach(function (id) {
      var part = progressOf(current.station, sectionsById[id], counts);
      tallyNodes[id].textContent = part.done + "/" + part.total;
    });
  }

  // -- photo strips ---------------------------------------------------------

  function renderShots(group, label) {
    var shots = el("div", { class: "shots" });

    photosIn(group).forEach(function (photo) {
      shots.appendChild(
        el(
          "button",
          {
            class: "shot",
            type: "button",
            "aria-label": "Photo of " + label,
            onclick: function () {
              openPhotoActions(photo, label);
            },
          },
          [
            el("img", { src: thumbUrl(photo), alt: "" }),
            photo.note ? el("span", { class: "note-flag", text: photo.note }) : null,
          ]
        )
      );
    });

    shots.appendChild(
      el(
        "button",
        {
          class: "addshot",
          type: "button",
          "aria-label": "Take a photo of " + label,
          onclick: function () {
            pickPhotos(group, true);
          },
        },
        [el("span", { class: "glyph", text: "📷" }), el("span", { text: "Camera" })]
      )
    );

    shots.appendChild(
      el(
        "button",
        {
          class: "addshot",
          type: "button",
          "aria-label": "Add photos of " + label + " from the library",
          onclick: function () {
            pickPhotos(group, false);
          },
        },
        [el("span", { class: "glyph", text: "🖼" }), el("span", { text: "Library" })]
      )
    );

    return shots;
  }

  function openPhotoActions(photo, label) {
    var note = window.prompt(
      "Caption for this " + label + " photo (prints under the image).\n\n" +
        "Leave it empty for no caption, or type DELETE to remove the photo.",
      photo.note || ""
    );
    if (note === null) return;
    if (note.trim().toUpperCase() === "DELETE") {
      store.deletePhoto(photo.id).then(refreshPhotos).then(renderKeepingScroll);
      toast("Photo removed");
      return;
    }
    photo.note = note.trim();
    store.putPhoto(photo).then(refreshPhotos).then(renderKeepingScroll);
  }

  function renderPhotoGroups(section) {
    section.groups.forEach(function (group) {
      var card = el("div", { class: "card" }, [el("h3", { text: group.label })]);
      card.appendChild(renderShots(group.id, group.label));
      app.appendChild(card);
    });
  }

  // -- report ---------------------------------------------------------------

  function renderReport() {
    var station = current.station;
    var counts = photoCounts();
    var progress = overallProgress(station, counts);

    app.appendChild(el("h2", { class: "section", text: "Generate report" }));
    app.appendChild(
      el("p", {
        class: "lede",
        text:
          "Fills the Unitywater template with everything above and downloads it as a Word document. " +
          "Blank fields stay blank, so you can generate a draft at any point.",
      })
    );

    if (!isFilled(station.values.sps_id)) {
      app.appendChild(
        el("div", {
          class: "banner bad",
          text: "Add the SPS number on the Cover section first — it names the file and the header.",
        })
      );
    }

    var list = el("ul", { class: "checklist" });
    schema.sections.forEach(function (section) {
      var part = progressOf(station, section, counts);
      var complete = part.done === part.total;
      list.appendChild(
        el("li", {}, [
          el("span", {
            class: "mark " + (complete ? "ok" : "todo"),
            text: complete ? "✓" : "·",
          }),
          el("span", { text: section.title }),
          el("span", { class: "count", text: part.done + "/" + part.total }),
        ])
      );
    });
    var shots = current.photos.length;
    list.appendChild(
      el("li", {}, [
        el("span", { class: "mark " + (shots ? "ok" : "todo"), text: shots ? "✓" : "·" }),
        el("span", { text: "Photographs" }),
        el("span", { class: "count", text: String(shots) }),
      ])
    );
    app.appendChild(el("div", { class: "card" }, [list]));

    var button = el("button", {
      class: "bigbtn",
      type: "button",
      text: "Generate Word report",
      onclick: function () {
        generateReport(button);
      },
    });
    app.appendChild(button);
    app.appendChild(
      el("p", {
        class: "note",
        text:
          "Anywhere you typed SPS-XXXXXX is swapped for " +
          (stationName(station) === "Unnamed station" ? "the station number" : stationName(station)) +
          ". Photos go into Appendix 1 grouped under the asset they belong to, two across, " +
          "with the condition rating in the heading.",
      })
    );

    app.appendChild(
      el("div", { class: "card" }, [
        el("h3", { text: "This station" }),
        el("p", {
          class: "note",
          text:
            progress.done + " of " + progress.total + " values filled, " + shots +
            (shots === 1 ? " photo" : " photos") + " captured.",
        }),
        el("div", { class: "rowactions" }, [
          el("button", {
            class: "iconbtn",
            type: "button",
            text: "Duplicate",
            onclick: duplicateStation,
          }),
          el("button", {
            class: "iconbtn",
            type: "button",
            text: "Delete station",
            onclick: function () {
              if (!window.confirm("Delete " + stationName(station) + " and all its photos?")) return;
              clearTimeout(saveTimer);
              current.station = null;
              store.deleteStation(station.id).then(backToList).then(function () {
                toast("Station deleted");
              });
            },
          }),
        ]),
      ])
    );
  }

  function duplicateStation() {
    var copy = newStation(null);
    copy.values = JSON.parse(JSON.stringify(current.station.values));
    copy.values.sps_id = "";
    conditionSection.assets.forEach(function (asset) {
      delete copy.values[asset.id + "_rating"];
      delete copy.values[asset.id + "_comment"];
    });
    store.putStation(copy).then(function () {
      toast("Copied the details — ratings, comments and photos start fresh");
      openStation(copy.id);
    });
  }

  /* Assemble the values the template wants, then hand off to docx.js. */
  function reportValues(station) {
    var values = {};
    var stationId = String(station.values.sps_id || "").trim();
    Object.keys(station.values).forEach(function (id) {
      var value = String(station.values[id] == null ? "" : station.values[id]);
      // A convenience worth having: the boilerplate paragraphs ship with
      // SPS-XXXXXX in them, and nobody should have to retype it.
      if (stationId) value = value.split("SPS-XXXXXX").join(stationId);
      values[id] = value;
    });
    return values;
  }

  function generateReport(button) {
    var station = current.station;
    button.disabled = true;
    button.textContent = "Building…";

    var ordered = [];
    (photoSection.groups || []).forEach(collect);
    (conditionSection.assets || []).forEach(collect);
    ["img_gis", "img_scada"].forEach(function (id) {
      collect({ id: id });
    });
    function collect(entry) {
      photosIn(entry.id).forEach(function (photo) {
        ordered.push(photo);
      });
    }

    Promise.all([
      loadTemplate(),
      Promise.all(
        ordered.map(function (photo) {
          return photo.blob.arrayBuffer().then(function (buffer) {
            return {
              group: photo.group,
              note: photo.note,
              width: photo.width,
              height: photo.height,
              type: "image/jpeg",
              bytes: new Uint8Array(buffer),
            };
          });
        })
      ),
    ])
      .then(function (loaded) {
        return window.SPSDocx.generate({
          template: loaded[0],
          schema: schema,
          values: reportValues(station),
          photos: loaded[1],
        });
      })
      .then(function (result) {
        return deliver(result.blob, result.fileName);
      })
      .then(function (how) {
        toast(how === "shared" ? "Report shared" : "Report saved to Files / Downloads");
      })
      .catch(function (error) {
        if (error && error.name === "AbortError") return; // share sheet dismissed
        console.error(error);
        toast(error.message || "Could not build the report");
      })
      .then(function () {
        button.disabled = false;
        button.textContent = "Generate Word report";
      });
  }

  /* On iOS the share sheet is the only route to Files, Mail or Teams, so try
   * that first and fall back to a plain download everywhere else. */
  function deliver(blob, fileName) {
    var file = null;
    if (typeof File === "function") {
      try {
        file = new File([blob], fileName, { type: blob.type });
      } catch {
        file = null; // very old WebKit — fall through to the download link
      }
    }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: fileName }).then(function () {
        return "shared";
      });
    }
    var url = URL.createObjectURL(blob);
    var link = el("a", { href: url, download: fileName });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 30000);
    return Promise.resolve("downloaded");
  }

  // ---------------------------------------------------------- backup / IO --

  function exportAll() {
    toast("Packing everything up…");
    store
      .allStations()
      .then(function (stations) {
        return Promise.all(
          stations.map(function (station) {
            return store.photosFor(station.id).then(function (photos) {
              return Promise.all(
                photos.map(function (photo) {
                  return blobToBase64(photo.blob).then(function (data) {
                    return {
                      id: photo.id,
                      group: photo.group,
                      note: photo.note,
                      width: photo.width,
                      height: photo.height,
                      createdAt: photo.createdAt,
                      data: data,
                    };
                  });
                })
              ).then(function (packed) {
                return { station: station, photos: packed };
              });
            });
          })
        );
      })
      .then(function (payload) {
        var blob = new Blob(
          [JSON.stringify({ format: "sps-assessments", version: 1, stations: payload })],
          { type: "application/json" }
        );
        return deliver(blob, "sps-assessments-backup.json");
      })
      .catch(function (error) {
        toast(error.message || "Export failed");
      });
  }

  function importAll() {
    var input = el("input", { type: "file", accept: ".json,application/json" });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      file
        .text()
        .then(function (text) {
          var payload = JSON.parse(text);
          if (payload.format !== "sps-assessments") throw new Error("Not an assessments backup");
          return payload.stations.reduce(function (chain, entry) {
            return chain.then(function () {
              return store.putStation(entry.station).then(function () {
                return Promise.all(
                  entry.photos.map(function (photo) {
                    return store.putPhoto({
                      id: photo.id,
                      stationId: entry.station.id,
                      group: photo.group,
                      note: photo.note,
                      width: photo.width,
                      height: photo.height,
                      createdAt: photo.createdAt,
                      blob: base64ToBlob(photo.data),
                    });
                  })
                );
              });
            });
          }, Promise.resolve());
        })
        .then(loadStations)
        .then(render)
        .then(function () {
          toast("Backup restored");
        })
        .catch(function (error) {
          toast(error.message || "Could not read that backup");
        });
    });
    input.click();
  }

  function blobToBase64(blob) {
    return blob.arrayBuffer().then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var chunk = 0x8000;
      var parts = [];
      for (var i = 0; i < bytes.length; i += chunk) {
        parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
      }
      return btoa(parts.join(""));
    });
  }

  function base64ToBlob(data) {
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: "image/jpeg" });
  }

  // ------------------------------------------------------------------ boot --

  /* Photo tallies for the list are derived, so they are kept beside the
   * stations rather than on them — nothing derived belongs in the database. */
  function loadStations() {
    return store.allStations().then(function (stations) {
      current.stations = stations;
      current.counts = Object.create(null);
      return Promise.all(
        stations.map(function (station) {
          return store.photosFor(station.id).then(function (photos) {
            current.counts[station.id] = photos.reduce(function (counts, photo) {
              counts[photo.group] = (counts[photo.group] || 0) + 1;
              return counts;
            }, Object.create(null));
          });
        })
      );
    });
  }

  backButton.addEventListener("click", backToList);
  topAction.addEventListener("click", function () {
    current.sectionId = "__report";
    window.scrollTo(0, 0);
    render();
  });
  window.addEventListener("pagehide", function () {
    if (current.station) saveNow();
  });

  // Arrow keys step through focus mode on anything with a keyboard, as long as
  // the arrow is not busy moving a caret.
  window.addEventListener("keydown", function (event) {
    if (!current.focus || current.focus.jumping) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "TEXTAREA" || tag === "INPUT") return;
    if (event.key === "ArrowRight") stepFocus(1);
    else if (event.key === "ArrowLeft") stepFocus(-1);
    else if (event.key === "Escape") exitFocus();
  });

  /* Focus mode is sized to the visible viewport rather than the window, so the
   * Next button stays above the iOS keyboard instead of behind it. */
  (function trackViewport() {
    var viewport = window.visualViewport;
    if (!viewport) return;
    var apply = function () {
      document.documentElement.style.setProperty("--vvh", viewport.height + "px");
    };
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    apply();
  })();

  wirePickers();

  requestDurableStorage().catch(function () {});

  loadStations()
    .then(render)
    .then(function () {
      // Warm the template so the first report still works with no signal.
      return loadTemplate().catch(function () {
        toast("Template not cached yet — open this once with signal");
      });
    })
    .catch(function (error) {
      app.appendChild(
        el("p", { class: "empty", text: "Could not start: " + (error.message || error) })
      );
    });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* offline install is a bonus, not a requirement */
      });
    });
  }
})();
