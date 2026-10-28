"""Refresh the public, numbered subway-exit snapshot used by the map."""

from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://portal.esrikr.com/arcgis/rest/services/Hosted/MOIS_KR_Subway/FeatureServer/0/query"
PAGE_SIZE = 2000


def query(**parameters):
    url = SOURCE + "?" + urlencode({"f": "json", "where": "1=1", **parameters})
    request = Request(url, headers={"User-Agent": "PinmapPrototype/1.0"})
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    if "error" in result:
        raise RuntimeError(result["error"])
    return result


total = query(returnCountOnly="true")["count"]
features = []
seen = set()
for offset in range(0, total, PAGE_SIZE):
    page = query(
        outFields="objectid,sub_ent_sn,entrc_no,stn_nm",
        outSR="4326",
        returnGeometry="true",
        orderByFields="objectid ASC",
        resultOffset=offset,
        resultRecordCount=PAGE_SIZE,
    )
    for row in page["features"]:
        attributes, point = row["attributes"], row["geometry"]
        identifier, number = attributes["objectid"], attributes["entrc_no"]
        if identifier in seen or not isinstance(number, int) or number < 1:
            raise ValueError(f"Invalid exit: {identifier}")
        seen.add(identifier)
        features.append({
            "type": "Feature",
            "id": identifier,
            "geometry": {"type": "Point", "coordinates": [round(point["x"], 6), round(point["y"], 6)]},
            "properties": {"number": number, "station": attributes["stn_nm"]},
        })

if len(features) != total:
    raise ValueError(f"Incomplete exit snapshot: {len(features)} of {total}")

output = {
    "type": "FeatureCollection",
    "metadata": {
        "source": SOURCE,
        "attribution": "행정안전부 주소제공서비스 · Esri Korea",
        "sourceDate": "2026-04-30",
    },
    "features": features,
}
(ROOT / "subway-exits.geojson").write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Saved {len(features)} numbered subway exits")
