import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path';

const __dirname = process.cwd();
const tempFolder = join(__dirname, 'temp');
const rulesFolder = join(__dirname, 'rule_provider');

const antiAdsD3wardUrl =
  'https://raw.githubusercontent.com/d3ward/toolz/master/src/d3host.txt';
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
const download = async (url: string, dest: string) => {
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
const replaceHeader = (text: string) => {
  return text.replace(
    /\[Adblock Plus\][\s\S]*?Contact:[^\n]*\n/g,
    'payload:\n',
  );
};

/**
 * The `replaceHeaderD3ward` function takes a text input and replaces a specific header and creator
 * information with the text "payload:".
 * @param {string} text - The `replaceHeaderD3ward` function takes a string `text` as input and
 * replaces any text that matches the pattern `# Title ... # Created by: d3ward` with the text
 * `'payload:\n'`.
 * @returns The `replaceHeaderD3ward` function takes a string as input and replaces any text that
 * matches the pattern "# Title...# Created by: d3ward" with the text 'payload:\n'. The function
 * returns the modified text after the replacement.
 */
const replaceHeaderD3ward = (text: string) => {
  return text.replace(/# Title[\s\S]*?# Created by: d3ward/g, 'payload:');
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
const replaceDomain = (text: string) => {
  return text.replace(/\|\|([^\^]+)\^/g, '- DOMAIN,$1');
};

/**
 * The function `replaceDomainD3ward` replaces IP addresses followed by a domain name with a specific
 * format.
 * @param {string} text - The `replaceDomainD3ward` function takes a string `text` as input and
 * replaces any occurrences of a specific pattern in the text. The pattern being replaced is `0.0.0.0`
 * followed by one or more spaces and then a domain name.
 * @returns The function `replaceDomainD3ward` takes a string as input and replaces any occurrences of
 * `0.0.0.0` followed by a space and a domain with `- DOMAIN,` followed by the domain. The modified
 * text is then returned.
 */
const replaceDomainD3ward = (text: string) => {
  return text.replace(/0\.0\.0\.0\s+([^\s]+)/g, '- DOMAIN,$1');
};

/**
 * The function `ensureDirectoryExists` checks if a directory exists and creates it if it doesn't.
 * @param {string} directory - The `directory` parameter in the `ensureDirectoryExists` function is a
 * string that represents the path of the directory that needs to be checked and created if it does not
 * already exist.
 */
const ensureDirectoryExists = async (directory: string) => {
  try {
    await fsPromises.access(directory);
  } catch {
    await fsPromises.mkdir(directory);
  }
};

/**
 * The function `processFile` downloads a file from a URL, reads its content, replaces headers and
 * domains using provided functions, and writes the modified content to an output file.
 * @param {string} url - The `url` parameter is a string representing the URL from which the file will
 * be downloaded.
 * @param {string} dest - The `dest` parameter in the `processFile` function represents the destination
 * path where the file will be downloaded to before processing. It is a string that specifies the
 * location on the file system where the downloaded file will be saved.
 * @param {string} outputFile - The `outputFile` parameter in the `processFile` function represents the
 * path where the processed file will be saved after applying the replacement functions. This parameter
 * specifies the location and name of the output file that will contain the modified content.
 * @param replaceHeaderFunc - The `replaceHeaderFunc` parameter is a function that takes a string as
 * input and returns a modified version of that string. In the `processFile` function, this function is
 * used to replace or modify the header content in the text read from a file before further processing.
 * @param replaceDomainFunc - The `replaceDomainFunc` parameter is a function that takes a string as
 * input and returns a modified version of that string where domain-related content has been replaced
 * or manipulated in some way. This function is used within the `processFile` function to process the
 * text content of a file before writing it to
 * @returns If an error occurs during the process of downloading, reading, or writing the file, the
 * function will return early and not proceed with further processing. If all operations are
 * successful, the function will complete without explicitly returning a value.
 */
const processFile = async (
  url: string,
  dest: string,
  outputFile: string,
  replaceHeaderFunc: (text: string) => string,
  replaceDomainFunc: (text: string) => string,
) => {
  try {
    await download(url, dest);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to download rules: ${error.message}`);
      throw error;
    }
    return;
  }

  let text: string;
  try {
    text = await fsPromises.readFile(dest, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to read file ${dest}: ${error.message}`);
      throw error;
    }
    return;
  }

  const header = replaceHeaderFunc(text);
  const domains = replaceDomainFunc(header);

  try {
    await fsPromises.writeFile(outputFile, domains);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to write file ${outputFile}: ${error.message}`);
      throw error;
    }
  }
};

const main = async () => {
  try {
    await ensureDirectoryExists(tempFolder);
    await ensureDirectoryExists(rulesFolder);

    const antiAdsD3wardTemp = join(tempFolder, 'd3ward.txt');
    const antiAdsTemp = join(tempFolder, 'oisd_full_abp.txt');
    const antiNSFWTemp = join(tempFolder, 'oisd_nsfw_abp.txt');

    const antiAdsD3wardProcessed = join(
      rulesFolder,
      'Blocklist_Ads_D3ward.yaml',
    );
    const antiAdsProcessed = join(rulesFolder, 'Blocklist_Ads.yaml');
    const antiNSFWProcessed = join(rulesFolder, 'Blocklist_NSFW.yaml');

    await Promise.all([
      processFile(
        antiAdsD3wardUrl,
        antiAdsD3wardTemp,
        antiAdsD3wardProcessed,
        replaceHeaderD3ward,
        replaceDomainD3ward,
      ),
      processFile(
        antiAdsUrl,
        antiAdsTemp,
        antiAdsProcessed,
        replaceHeader,
        replaceDomain,
      ),
      processFile(
        antiNSFWUrl,
        antiNSFWTemp,
        antiNSFWProcessed,
        replaceHeader,
        replaceDomain,
      ),
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
