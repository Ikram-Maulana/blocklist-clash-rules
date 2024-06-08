import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path';

const __dirname = process.cwd();
const tempFolder = join(__dirname, 'temp');
const rulesFolder = join(__dirname, 'rule_provider');

const antiAdsUrl = 'https://big.oisd.nl';
const antiNSFWUrl = 'https://nsfw.oisd.nl';

/**
 * The `download` function asynchronously downloads a file from a specified URL and saves it to a
 * destination using TypeScript.
 * @param {string} url - The `url` parameter is the URL from which you want to download a file.
 * @param {string} dest - The `dest` parameter in the `download` function represents the destination
 * path where the downloaded file will be saved. It should be a string that specifies the full path
 * including the file name where you want to save the downloaded file on your local filesystem.
 */
export const download = async (url: string, dest: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file from ${url}: ${response.statusText}`,
    );
  }

  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    if (response.body) {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    } else {
      reject(new Error('Response body is null'));
    }
  }).catch((error) => {
    console.error(`Failed to write to file stream: ${error}`);
    throw error;
  });
};

/**
 * The `replaceHeader` function in TypeScript replaces a specific header pattern in a text with a new
 * string.
 * @param {string} text - The `replaceHeader` function takes a string `text` as input and replaces any
 * occurrence of a specific pattern with the text "payload:". The pattern being replaced is a string
 * that starts with "[Adblock Plus]" followed by any characters (including new lines) until the word
 * "Contact:" is
 * @returns The `replaceHeader` function is returning the input `text` with any occurrences of the
 * pattern `/\[Adblock Plus\][\s\S]*?Contact:[^\n]*\n/g` replaced with the string "payload:\n".
 */
export const replaceHeader = (text: string) => {
  return text.replace(
    /\[Adblock Plus\][\s\S]*?Contact:[^\n]*\n/g,
    'payload:\n',
  );
};

/**
 * The function `replaceDomain` takes a string as input and replaces occurrences of a specific pattern
 * with a modified version containing "- DOMAIN," prefix.
 * @param {string} text - The `replaceDomain` function takes a string `text` as input and replaces any
 * occurrences of `||` followed by any characters except `^`, and ending with `^` with "- DOMAIN,"
 * followed by the captured characters.
 * @returns The `replaceDomain` function takes a string as input and replaces any occurrences of `||`
 * followed by any characters that are not `^`, and ending with `^` with the string "- DOMAIN,"
 * followed by the captured characters. The modified text is then returned.
 */
export const replaceDomain = (text: string) => {
  return text.replace(/\|\|([^\^]+)\^/g, '- DOMAIN,$1');
};

/**
 * The function `ensureDirectoryExists` checks if a directory exists and creates it if it doesn't.
 * @param {string} directory - The `directory` parameter in the `ensureDirectoryExists` function is a
 * string that represents the path of the directory that needs to be checked and created if it does not
 * already exist.
 */
export const ensureDirectoryExists = async (directory: string) => {
  try {
    await fsPromises.access(directory);
  } catch {
    await fsPromises.mkdir(directory);
  }
};

/**
 * The function `processFile` downloads a file from a given URL, reads its content, processes the
 * content by replacing headers and domains, and then writes the processed content to an output file.
 * @param {string} url - The `url` parameter is the URL from which the file needs to be downloaded.
 * @param {string} dest - The `dest` parameter in the `processFile` function represents the destination
 * path where the file will be downloaded to before processing.
 * @param {string} outputFile - The `outputFile` parameter in the `processFile` function represents the
 * path where the processed data will be saved after downloading and processing the file from the
 * provided URL.
 * @returns The `processFile` function returns nothing explicitly, but it may return early if an error
 * occurs during the download, reading, or writing operations. In those cases, the function will log an
 * error message and return early without completing the processing of the file.
 */
export const processFile = async (
  url: string,
  dest: string,
  outputFile: string,
) => {
  try {
    await download(url, dest);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to download rules: ${error.message}`);
    }

    return;
  }

  let text: string;
  try {
    text = await fsPromises.readFile(dest, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read file ${dest}: ${error.message}`);
    }

    return;
  }

  const header = replaceHeader(text);
  const domains = replaceDomain(header);

  try {
    await fsPromises.writeFile(outputFile, domains);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to write file ${outputFile}: ${error.message}`);
    }
  }
};

const main = async () => {
  try {
    await ensureDirectoryExists(tempFolder);
    await ensureDirectoryExists(rulesFolder);

    const antiAdsTemp = join(tempFolder, 'oisd_full_abp.txt');
    const antiNSFWTemp = join(tempFolder, 'oisd_nsfw_abp.txt');

    const antiAdsProcessed = join(rulesFolder, 'Blocklist_Ads.yaml');
    const antiNSFWProcessed = join(rulesFolder, 'Blocklist_NSFW.yaml');

    await Promise.all([
      processFile(antiAdsUrl, antiAdsTemp, antiAdsProcessed),
      processFile(antiNSFWUrl, antiNSFWTemp, antiNSFWProcessed),
    ]);

    await fsPromises.rm(tempFolder, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to run the script: ${error.message}`);
    } else {
      console.error('Failed to run the script');
    }
  }
};

void main();
