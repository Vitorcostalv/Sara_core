from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FAUNA_DIR = ROOT / "apps" / "frontend" / "public" / "fauna"
MANIFEST_PATH = FAUNA_DIR / "fauna-assets.manifest.json"
CREDITS_PATH = FAUNA_DIR / "CREDITS.md"
MISSING_PATH = FAUNA_DIR / "MISSING_ASSETS.md"
TARGET_SIZE = 512
USER_AGENT = "SaraCoreFaunaAssetPrep/1.0"


ALLOWED_PHYLLOPIC_LICENSES = {
    "https://creativecommons.org/publicdomain/zero/1.0/": "CC0",
    "https://creativecommons.org/publicdomain/mark/1.0/": "Public Domain",
    "https://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
    "https://creativecommons.org/licenses/by/3.0/": "CC BY 3.0",
    "https://creativecommons.org/licenses/by/2.5/": "CC BY 2.5",
    "https://creativecommons.org/licenses/by-sa/4.0/": "CC BY-SA 4.0",
    "https://creativecommons.org/licenses/by-sa/3.0/": "CC BY-SA 3.0",
    "https://creativecommons.org/licenses/by-sa/2.5/": "CC BY-SA 2.5",
}

GAME_ICONS_LICENSE = "CC BY 3.0"
GAME_ICONS_LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/"


@dataclass(frozen=True)
class AssetSpec:
    species_id: str
    common_name: str
    scientific_name: str
    review_status: str
    source_kind: str
    ref: str
    notes: str
    author_hint: str | None = None
    source_page: str | None = None
    source_name: str | None = None
    license_name: str | None = None
    license_url: str | None = None
    remove_light_bg: bool = False


ASSETS: list[AssetSpec] = [
    AssetSpec("capivara", "Capivara", "Hydrochoerus hydrochaeris", "accepted", "phylopic", "9c234021-ce53-45d9-8fdd-b0ca3115a451", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("onca-pintada", "Onça-pintada", "Panthera onca", "accepted", "phylopic", "c5362c8a-0c93-41f5-9d4d-674dbe231318", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-javali", "Javali", "Sus scrofa", "accepted", "phylopic", "48d65919-38f6-4bd0-bb8a-57872900ed18", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("anta", "Anta", "Tapirus terrestris", "accepted", "phylopic", "4fcdd729-6eb6-42b8-be67-303077fa6d19", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("veado-mateiro", "Veado-mateiro", "Mazama americana", "needs-review", "phylopic", "09e12cc6-4885-402c-95df-f331608e27c1", "Proxy licenciado de cervídeo no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("paca", "Paca", "Cuniculus paca", "accepted", "phylopic", "f83d88a6-d344-47f1-a822-052826628b9a", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("tatu-galinha", "Tatu-galinha", "Dasypus novemcinctus", "accepted", "phylopic", "780109d6-9c70-4b1e-880e-d70e545d35ec", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("arara-azul", "Arara-azul", "Anodorhynchus hyacinthinus", "accepted", "phylopic", "0e752edb-ec92-4f5e-b988-2b22566a196e", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("tucano-toco", "Tucano-toco", "Ramphastos toco", "accepted", "phylopic", "fc6845fb-070a-45bc-a537-79154a054d99", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("garca-branca", "Garça-branca", "Ardea alba", "accepted", "phylopic", "38e8ab0b-9010-4b9f-a4a5-39a06f7b346b", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("onca-parda", "Onça-parda", "Puma concolor", "accepted", "phylopic", "c124d3fc-f9ff-4cc1-8141-1585c5d0d174", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("lobo-guara", "Lobo-guará", "Chrysocyon brachyurus", "accepted", "phylopic", "5ad223f0-879e-4127-b4c7-3cf25786052d", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("gato-do-mato", "Gato-do-mato", "Leopardus tigrinus", "accepted", "phylopic", "3961f620-a0b4-448c-b69c-8b5c6595e6c4", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("jacare-do-pantanal", "Jacaré-do-pantanal", "Caiman yacare", "needs-review", "phylopic", "fde166d6-e855-45a6-99ee-92e0789c26af", "Proxy licenciado de Caiman crocodilus no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("sucuri", "Sucuri-verde", "Eunectes murinus", "accepted", "phylopic", "3bc382f7-f157-4462-b28d-2d30f5a6ba96", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("jabuti", "Jabuti-piranga", "Chelonoidis carbonarius", "accepted", "phylopic", "760cced8-4303-49b4-bc4c-bf74ec652304", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("sapo-cururu", "Sapo-cururu", "Rhinella diptycha", "needs-review", "phylopic", "411ddd2c-12e8-4e92-9399-be8406d00356", "Proxy licenciado de Rhinella marina no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("formiga-cortadeira", "Formiga-cortadeira", "Atta sexdens", "accepted", "wikimedia", "https://upload.wikimedia.org/wikipedia/commons/a/a4/Atta.sexdens.jpg", "Fundo claro removido por threshold + recorte + canvas quadrado 512x512.", source_page="https://commons.wikimedia.org/wiki/File:Atta.sexdens.jpg", source_name="Wikimedia Commons", author_hint="Sarefo", license_name="CC BY-SA 3.0", license_url="https://creativecommons.org/licenses/by-sa/3.0/", remove_light_bg=True),
    AssetSpec("cutia", "Cutia", "Dasyprocta azarae", "needs-review", "phylopic", "7cd56d09-bc93-4974-9e87-65fa1f04652f", "Proxy licenciado de Dasyprocta leporina no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("queixada", "Queixada", "Tayassu pecari", "accepted", "phylopic", "0ed03276-b356-4092-a4f7-66f4b1842fc4", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("bugio", "Bugio-ruivo", "Alouatta guariba", "needs-review", "phylopic", "564c9708-bedb-4c1c-afc7-307f416901f0", "Proxy licenciado de Alouatta caraya no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("seriema", "Seriema", "Cariama cristata", "accepted", "phylopic", "694ae92f-857d-4675-838b-2a9f8fa65583", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("inseto-cavernicola", "Inseto troglóbio", "Troglobita sp.", "accepted", "game-icons", "https://game-icons.net/icons/000000/transparent/1x1/delapouite/cricket.png", "Ícone genérico licenciado de inseto + canvas quadrado 512x512.", source_page="https://game-icons.net/1x1/delapouite/cricket.html", source_name="Game-icons.net", author_hint="Delapouite", license_name=GAME_ICONS_LICENSE, license_url=GAME_ICONS_LICENSE_URL),
    AssetSpec("morcego", "Colônia de morcegos", "Desmodus rotundus", "accepted", "phylopic", "1feae9d3-df0f-4475-9dfb-7a4802b6c674", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("aranha-cavernicola", "Aranha-de-caverna", "Loxosceles sp.", "accepted", "game-icons", "https://game-icons.net/icons/000000/transparent/1x1/skoll/long-legged-spider.png", "Ícone genérico licenciado de aranha + canvas quadrado 512x512.", source_page="https://game-icons.net/1x1/skoll/long-legged-spider.html", source_name="Game-icons.net", author_hint="Skoll", license_name=GAME_ICONS_LICENSE, license_url=GAME_ICONS_LICENSE_URL),
    AssetSpec("serpente-cavernicola", "Serpente-cavernícola", "Boa constrictor", "accepted", "phylopic", "29aac993-3298-4a19-8c60-19184c94effe", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("peixe-cego", "Peixe-cego", "Astyanax mexicanus", "accepted", "phylopic", "69b71d14-ae2f-46eb-92cf-edf4a07adbe6", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-tilapia-do-nilo", "Tilápia-do-nilo", "Oreochromis niloticus", "accepted", "phylopic", "9c031447-a620-4b7d-98bb-25dd4133eda7", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-bufalo-asiatico", "Búfalo-asiático", "Bubalus bubalis", "needs-review", "phylopic", "5ede126f-6a18-4a08-898d-e48828e7dcaa", "Proxy licenciado de Bubalus arnee no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("invasor-cabra-domestica", "Cabra-doméstica", "Capra hircus", "needs-review", "phylopic", "2b07a361-5d1b-4bb9-a61e-a7708cf57ecb", "Proxy licenciado de Capra ibex no PhyloPic; recorte alpha + canvas 512x512."),
    AssetSpec("invasor-lebre-europeia", "Lebre-europeia", "Lepus europaeus", "accepted", "phylopic", "4afd156c-051f-4b43-9064-cf6b673faadb", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-tucunare", "Tucunaré", "Cichla ocellaris", "needs-review", "game-icons", "https://game-icons.net/icons/000000/transparent/1x1/cathelineau/flying-trout.png", "Ícone genérico licenciado de peixe + canvas quadrado 512x512.", source_page="https://game-icons.net/1x1/cathelineau/flying-trout.html", source_name="Game-icons.net", author_hint="Cathelineau", license_name=GAME_ICONS_LICENSE, license_url=GAME_ICONS_LICENSE_URL),
    AssetSpec("invasor-ra-touro", "Rã-touro", "Lithobates catesbeianus", "accepted", "phylopic", "77f50b2e-9679-4ded-9faf-ff77d490c40a", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-caramujo-gigante-africano", "Caramujo-gigante-africano", "Lissachatina fulica", "accepted", "phylopic", "8c89f14e-7c7b-4844-b0c3-dd3f90818660", "Recorte alpha + canvas quadrado 512x512."),
    AssetSpec("invasor-mexilhao-dourado", "Mexilhão-dourado", "Limnoperna fortunei", "accepted", "phylopic", "f33aa45f-90aa-4112-90a0-a32f08185271", "Recorte alpha + canvas quadrado 512x512."),
]


def fetch_bytes(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req) as response:
        return response.read()


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).replace("\n", " ").strip()


def choose_phylopic_raster(links: dict[str, Any]) -> str:
    rasters = links.get("rasterFiles") or []
    for raster in rasters:
        sizes = raster.get("sizes", "")
        if "512" in sizes:
            return raster["href"]
    if rasters:
        return rasters[-1]["href"]
    source = links.get("sourceFile")
    if source and source.get("type") == "image/png":
        return source["href"]
    raise RuntimeError("PhyloPic asset without raster PNG")


def remove_light_background(image: Image.Image, threshold: int = 245) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)
    return rgba


def crop_to_subject(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        raise RuntimeError("Image has no visible pixels after normalization")
    return rgba.crop(bbox)


def normalize_image(image: Image.Image) -> Image.Image:
    subject = crop_to_subject(image)
    width, height = subject.size
    pad = int(TARGET_SIZE * 0.08)
    scale = min((TARGET_SIZE - pad * 2) / width, (TARGET_SIZE - pad * 2) / height)
    resized = subject.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    offset = ((TARGET_SIZE - resized.width) // 2, (TARGET_SIZE - resized.height) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


def phylopic_payload(spec: AssetSpec) -> tuple[bytes, dict[str, str]]:
    detail = fetch_json(f"https://api.phylopic.org/images/{spec.ref}")
    license_url = detail["_links"]["license"]["href"]
    license_name = ALLOWED_PHYLLOPIC_LICENSES.get(license_url)
    if not license_name:
        raise RuntimeError(f"Incompatible PhyloPic license for {spec.species_id}: {license_url}")
    author = fetch_json("https://api.phylopic.org" + detail["_links"]["contributor"]["href"])["name"]
    raster_url = choose_phylopic_raster(detail["_links"])
    return fetch_bytes(raster_url), {
        "sourceName": "PhyloPic",
        "sourceUrl": f"https://www.phylopic.org/images/{spec.ref}",
        "author": author,
        "license": license_name,
        "licenseUrl": license_url,
    }


def game_icons_payload(spec: AssetSpec) -> tuple[bytes, dict[str, str]]:
    return fetch_bytes(spec.ref), {
        "sourceName": spec.source_name or "Game-icons.net",
        "sourceUrl": spec.source_page or spec.ref,
        "author": spec.author_hint or "Unknown",
        "license": spec.license_name or GAME_ICONS_LICENSE,
        "licenseUrl": spec.license_url or GAME_ICONS_LICENSE_URL,
    }


def wikimedia_payload(spec: AssetSpec) -> tuple[bytes, dict[str, str]]:
    if not spec.source_page:
        raise RuntimeError("Wikimedia asset missing source page")
    return fetch_bytes(spec.ref), {
        "sourceName": spec.source_name or "Wikimedia Commons",
        "sourceUrl": spec.source_page,
        "author": spec.author_hint or "Unknown",
        "license": spec.license_name or "",
        "licenseUrl": spec.license_url or "",
    }


def build_asset(spec: AssetSpec) -> dict[str, Any]:
    if spec.source_kind == "phylopic":
        payload, meta = phylopic_payload(spec)
    elif spec.source_kind == "game-icons":
        payload, meta = game_icons_payload(spec)
    elif spec.source_kind == "wikimedia":
        payload, meta = wikimedia_payload(spec)
    else:
        raise RuntimeError(f"Unsupported source kind {spec.source_kind}")

    image = Image.open(io.BytesIO(payload))
    if spec.remove_light_bg:
        image = remove_light_background(image)
    normalized = normalize_image(image)
    output_path = FAUNA_DIR / f"{spec.species_id}.png"
    normalized.save(output_path, format="PNG")

    return {
        "speciesId": spec.species_id,
        "commonName": spec.common_name,
        "scientificName": spec.scientific_name,
        "localFile": f"/fauna/{spec.species_id}.png",
        "sourceName": meta["sourceName"],
        "sourceUrl": meta["sourceUrl"],
        "author": meta["author"],
        "license": meta["license"],
        "licenseUrl": meta["licenseUrl"],
        "modifications": spec.notes,
        "reviewStatus": spec.review_status,
    }


def write_manifest(entries: list[dict[str, Any]]) -> None:
    MANIFEST_PATH.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_credits(entries: list[dict[str, Any]]) -> None:
    lines = [
        "# Fauna Asset Credits",
        "",
        "| file | animal | source | author | license | link | modifications |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for entry in entries:
        lines.append(
            f"| `{Path(entry['localFile']).name}` | {entry['commonName']} | {entry['sourceName']} | "
            f"{entry['author']} | {entry['license']} | {entry['sourceUrl']} | {entry['modifications']} |"
        )
    CREDITS_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_missing(entries: list[dict[str, Any]]) -> None:
    review = [entry for entry in entries if entry["reviewStatus"] == "needs-review"]
    lines = ["# Missing Or Manual Review"]
    if review:
        lines.extend(["", "## Needs Review", ""])
        for entry in review:
            lines.append(
                f"- `{entry['speciesId']}` — {entry['commonName']} ({entry['scientificName']}): {entry['modifications']}"
            )
    else:
        lines.extend(["", "Nenhum asset pendente de revisão manual."])
    MISSING_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate(entries: list[dict[str, Any]]) -> None:
    disallowed = ("NC", "ND", "fair", "unknown")
    seen_species_ids: set[str] = set()
    seen_local_files: set[str] = set()
    for entry in entries:
        species_id = entry["speciesId"]
        local_file = entry["localFile"]

        if species_id in seen_species_ids:
            raise RuntimeError(f"Duplicate speciesId: {species_id}")
        seen_species_ids.add(species_id)

        if local_file in seen_local_files:
            raise RuntimeError(f"Duplicate localFile: {local_file}")
        seen_local_files.add(local_file)

        if not local_file.endswith(".png"):
            raise RuntimeError(f"localFile must end with .png for {species_id}: {local_file}")

        png_path = FAUNA_DIR / Path(local_file).name
        if not png_path.exists():
            raise RuntimeError(f"Missing mapped asset: {png_path}")
        with Image.open(png_path) as image:
            image.load()
            if image.size != (TARGET_SIZE, TARGET_SIZE):
                raise RuntimeError(f"Unexpected size for {png_path}: {image.size}")

        if not entry["sourceUrl"]:
            raise RuntimeError(f"Missing sourceUrl for {species_id}")
        if not entry["author"]:
            raise RuntimeError(f"Missing author for {species_id}")
        if entry["author"] == "Unknown":
            raise RuntimeError(f"Author must not be 'Unknown' for {species_id}")
        if not entry["licenseUrl"]:
            raise RuntimeError(f"Missing licenseUrl for {species_id}")
        if not entry["modifications"]:
            raise RuntimeError(f"Missing modifications for {species_id}")

        if not entry["license"]:
            raise RuntimeError(f"Missing license for {species_id}")
        license_text = entry["license"].lower()
        if any(token.lower() in license_text for token in disallowed):
            raise RuntimeError(f"Disallowed license accepted for {species_id}: {entry['license']}")


def main() -> None:
    FAUNA_DIR.mkdir(parents=True, exist_ok=True)
    entries = [build_asset(spec) for spec in ASSETS]
    entries.sort(key=lambda entry: entry["speciesId"])
    write_manifest(entries)
    write_credits(entries)
    write_missing(entries)
    validate(entries)
    print(f"Prepared {len(entries)} fauna assets.")


if __name__ == "__main__":
    main()
