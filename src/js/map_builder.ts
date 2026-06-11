/**
 * Functions for assembling user-facing map components
 */
import {
  ShieldDefinitions,
  URLShieldRenderer,
} from "@americana/maplibre-shield-generator";
import config from "../config.js";

import {
  shieldPredicate,
  networkPredicate,
  routeParser,
} from "../js/shield_format.js";

import * as Poi from "../js/poi.js";
import * as Style from "./style.js";
import maplibregl, {
  type MapOptions,
  type StyleSpecification,
} from "maplibre-gl";
import { MapView } from "./map_view.js";
import type { DebugOptions } from "@americana/maplibre-shield-generator/src/types.js";
import { getGlobalStateForLocalization } from "@americana/diplomat";

// Force Kabyle locale, ignore browser detection
function getKabyleLocales(): string[] {
  return ["kab"];
}

export function buildStyle(): StyleSpecification {
  var getUrl = window.location;
  var baseUrl = (
    getUrl.protocol +
    "//" +
    getUrl.host +
    removeAfterLastSlash(getUrl.pathname)
  )
    .replace(/\/+$/, "");
  return Style.build(
    config.OPENMAPTILES_URL,
    `${baseUrl}/sprites/sprite`,
    config.FONT_URL ?? "https://font.americanamap.org/{fontstack}/{range}.pbf`,
    getKabyleLocales()
  );
}

function removeAfterLastSlash(str: string): string {
  const lastSlashIndex = str.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return str;
  }
  return str.substring(0, lastSlashIndex + 1);
}

export function loadRTLPlugin(): void {
  maplibregl.setRTLTextPlugin(
    "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
    true
  );
}

export function createMap(
  window: Window,
  shieldDefCallback: (shields: ShieldDefinitions) => void,
  options: MapOptions,
  debugOptions: DebugOptions
): MapView {
  window["maplibregl"] = maplibregl;
  let map: MapView = (window["map"] = new MapView(options));

  const shieldRenderer = new URLShieldRenderer("shields.json", routeParser)
    .debugOptions(debugOptions)
    .filterImageID(shieldPredicate)
    .filterNetwork(networkPredicate)
    .renderOnMaplibreGL(map)
    .onShieldDefLoad(shieldDefCallback);

  map.once("styledata", (event) => {
    let localizationState = getGlobalStateForLocalization(
      getKabyleLocales(),
      {
        uppercaseCountryNames: true,
        glossLocalNames: false, // ONLY Kabyle, no dual labels
      }
    );
    for (let [key, value] of Object.entries(localizationState)) {
      map.setGlobalStateProperty(key, value);
    }
  });

  map.on("styleimagemissing", function (e) {
    switch (e.id.split("\n")[0]) {
      case "shield":
        break;
      case "poi":
        Poi.missingIconHandler(shieldRenderer, map, e);
        break;
      default:
        console.warn("Image id not recognized:", JSON.stringify(e.id));
        break;
    }
  });
  return map;
}
