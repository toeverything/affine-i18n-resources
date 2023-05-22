import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";

const TOLGEE_API_KEY = process.env["TOLGEE_API_KEY"];
const TOLGEE_API_URL = "https://i18n.affine.pro";
const BUILD_DIR = path.resolve(process.cwd(), "build");

if (!TOLGEE_API_KEY) {
  throw new Error(`Please set "TOLGEE_API_KEY" as environment variable!`);
}

const withAuth = (fetch: typeof globalThis.fetch): typeof globalThis.fetch => {
  const headers = new Headers({
    "X-API-Key": TOLGEE_API_KEY,
  });

  const isRequest = (input: RequestInfo | URL): input is Request => {
    return typeof input === "object" && !("href" in input);
  };

  return new Proxy(fetch, {
    apply(
      target,
      thisArg: unknown,
      argArray: Parameters<typeof globalThis.fetch>
    ) {
      if (isRequest(argArray[0])) {
        // Request
        if (!argArray[0].headers) {
          argArray[0] = {
            ...argArray[0],
            headers,
          };
        }
      } else {
        // URL or URLLike + ?RequestInit
        if (!argArray[1]) {
          argArray[1] = {};
        }
        if (!argArray[1].headers) {
          argArray[1].headers = headers;
        }
      }
      return target.apply(thisArg, argArray);
    },
  });
};

const fetchWithAuth = withAuth(globalThis.fetch);

const downloadTolgeeResources = async (projectName: string) => {
  const url = `${TOLGEE_API_URL}/api/project/export/jsonZip`;
  const resp = await fetchWithAuth(url);

  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(url + " " + resp.status + ": " + (await resp.text()));
  }
  fs.writeFileSync(
    path.resolve(BUILD_DIR, `${projectName}.zip`),
    Buffer.from(await resp.arrayBuffer())
  );

  const zip = new AdmZip(path.resolve(BUILD_DIR, `${projectName}.zip`));
  zip.extractAllTo(path.resolve(BUILD_DIR, projectName), true);
};

const main = async () => {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR);
  }
  const FOLDER = "AFFiNE";
  await downloadTolgeeResources(FOLDER);
};

main();
