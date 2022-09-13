import fs from "fs-extra";
import path from "path";
import glob from "glob";
import url from "url";
import del from "del";
import { localizationDirectories } from "./build/localization.mjs";

const __filename = url.fileURLToPath(new URL(import.meta.url));
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, "..");
const source = path.join(root, "built/local");
const dest = path.join(root, "lib");
const copyright = fs.readFileSync(path.join(__dirname, "../CopyrightNotice.txt"), "utf-8");

async function produceLKG() {
    console.log(`Building LKG from ${source} to ${dest}`);
    await del(`${dest.replace(/\\/g, "/")}/**`, { ignore: ["**/README.md"] });
    await fs.mkdirp(dest);
    await copyLibFiles();
    await copyLocalizedDiagnostics();
    await copyTypesMap();
    await copyScriptOutputs();
    await copyDeclarationOutputs();
    await writeGitAttributes();
}

async function copyLibFiles() {
    await copyFilesWithGlob("lib?(.*).d.ts");
}

async function copyLocalizedDiagnostics() {
    for (const d of localizationDirectories) {
        const fileName = path.join(source, d);
        if (fs.statSync(fileName).isDirectory()) {
            await fs.copy(fileName, path.join(dest, d));
        }
    }
}

async function copyTypesMap() {
    await copyFromBuiltLocal("typesMap.json"); // Cannot accommodate copyright header
}

async function copyScriptOutputs() {
    await copyFromBuiltLocal("cancellationToken.js");
    await copyFromBuiltLocal("tsc.js");
    await copyFromBuiltLocal("tsserver.js");
    await copyFromBuiltLocal("tsserverlibrary.js");
    await copyFromBuiltLocal("typescript.js");
    await copyFromBuiltLocal("typingsInstaller.js");
    await copyFromBuiltLocal("watchGuard.js");
}

async function copyDeclarationOutputs() {
    await copyWithCopyright("tsserverlibrary.d.ts");
    await copyWithCopyright("typescript.d.ts");
}

async function writeGitAttributes() {
    await fs.writeFile(path.join(dest, ".gitattributes"), `* text eol=lf`, "utf-8");
}

/**
 * @param {string} fileName
 * @param {string} destName
 */
async function copyWithCopyright(fileName, destName = fileName) {
    const content = await fs.readFile(path.join(source, fileName), "utf-8");
    await fs.writeFile(path.join(dest, destName), copyright + "\n" + content);
}

/**
 * @param {string} fileName
 */
async function copyFromBuiltLocal(fileName) {
    await fs.copy(path.join(source, fileName), path.join(dest, fileName));
}

/**
 * @param {string} pattern
 */
async function copyFilesWithGlob(pattern) {
    const files = glob.sync(pattern, { cwd: source }).map(f => path.basename(f));
    for (const f of files) {
        await copyFromBuiltLocal(f);
    }
    console.log(`Copied ${files.length} files matching pattern ${pattern}`);
}

process.on("unhandledRejection", err => {
    throw err;
});
produceLKG().then(() => console.log("Done"), err => {
    throw err;
});
