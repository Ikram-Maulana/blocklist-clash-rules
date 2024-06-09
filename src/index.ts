import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path';

const __dirname = process.cwd();
const tempFolder = join(__dirname, 'temp');
const rulesFolder = join(__dirname, 'rule_provider');

/* The above TypeScript code defines an array `rawUrls` containing objects with properties for URL,
temporary file name, and processed file name. Each object represents a source URL for raw data
related to adblock lists or blocklists. The temporary file name is used for storing the downloaded
data temporarily, and the processed file name is the name of the final processed blocklist file.
These URLs are likely used for fetching data to create or update various adblock lists in YAML
format. */
const rawUrls = [
  {
    url: 'https://raw.githubusercontent.com/d3ward/toolz/master/src/d3host.txt',
    tempFileName: 'd3ward.txt',
    processedFileName: 'Blocklist_Ads_D3ward.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/ABPindo/indonesianadblockrules/master/subscriptions/aghome.txt',
    tempFileName: 'abpindo_adblock.txt',
    processedFileName: 'Blocklist_Ads_Indo.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt',
    tempFileName: 'hagezi_multi_pro.txt',
    processedFileName: 'Blocklist_Ads_MultiPro.yaml',
  },
  {
    url: 'https://big.oisd.nl',
    tempFileName: 'oisd_full_abp.txt',
    processedFileName: 'Blocklist_Ads_OISD.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/doh-vpn-proxy-bypass.txt',
    tempFileName: 'hagezi_doh_vpn_proxy_bypass.txt',
    processedFileName: 'Blocklist_DohVpnProxyBypass.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/native.apple.txt',
    tempFileName: 'hagezi_native_apple.txt',
    processedFileName: 'Blocklist_Native_Apple.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.oppo-realme.txt',
    tempFileName: 'hagezi_native_oppo_realme.txt',
    processedFileName: 'Blocklist_Native_OppoRealme.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/native.tiktok.extended.txt',
    tempFileName: 'hagezi_native_tiktok_extended.txt',
    processedFileName: 'Blocklist_Native_TikTok_Extended.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.tiktok.txt',
    tempFileName: 'hagezi_native_tiktok.txt',
    processedFileName: 'Blocklist_Native_TikTok.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/native.vivo.txt',
    tempFileName: 'hagezi_native_vivo.txt',
    processedFileName: 'Blocklist_Native_Vivo.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.winoffice.txt',
    tempFileName: 'hagezi_native_winoffice.txt',
    processedFileName: 'Blocklist_Native_WinOffice.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/native.xiaomi.txt',
    tempFileName: 'hagezi_native_xiaomi.txt',
    processedFileName: 'Blocklist_Native_Xiaomi.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/nosafesearch.txt',
    tempFileName: 'hagezi_nosafesearch.txt',
    processedFileName: 'Blocklist_NoSafeSearch.yaml',
  },
  {
    url: 'https://nsfw.oisd.nl',
    tempFileName: 'oisd_nsfw_abp.txt',
    processedFileName: 'Blocklist_NSFW.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.medium.txt',
    tempFileName: 'hagezi_tif_medium.txt',
    processedFileName: 'Blocklist_Threat_Medium.yaml',
  },
  {
    url: 'https://raw.githubusercontent.com/crazy-max/WindowsSpyBlocker/master/data/hosts/spy.txt',
    tempFileName: 'crazymax_windows_spy.txt',
    processedFileName: 'Blocklist_WindowsSpy.yaml',
  },
];

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
 * The `modifyHeader` function in TypeScript modifies a given text by replacing certain patterns with
 * 'payload:\n\n'.
 * @param {string} text - The `modifyHeader` function takes a string `text` as input and modifies it
 * based on certain patterns.
 * @returns The `modifyHeader` function takes a string as input and checks for specific patterns using
 * regular expressions. If a match is found, it replaces the matched text with 'payload:\n\n'.
 */
const modifyHeader = (text: string) => {
  if (text.match(/^(.*?)(?=\|\|)/s)) {
    return text.replace(/^(.*?)(?=\|\|)/s, 'payload:\n\n');
  }

  if (
    text.match(/^(.*?)(?=b(?:(?:https?|ftp):\/\/)?\w[\w-]*(?:\.[\w-]+)+\b)/s)
  ) {
    return text.replace(
      /^(.*?)(?=b(?:(?:https?|ftp):\/\/)?\w[\w-]*(?:\.[\w-]+)+\b)/s,
      'payload:\n\n',
    );
  }

  return text.replace(/^(.*?)(?=0\.0\.0\.0)/s, 'payload:\n\n');
};

/**
 * The `modifyDomain` function in TypeScript modifies text by replacing domain names with a specific
 * format.
 * @param {string} text - The `modifyDomain` function takes a string `text` as input and performs
 * certain modifications based on different patterns found in the text.
 * @returns The `modifyDomain` function takes a string `text` as input and performs different
 * replacements based on the patterns found in the text.
 */
const modifyDomain = (text: string) => {
  if (text.match(/\|\|([^\^]+)\^/g)) {
    return text.replace(/\|\|([^\^]+)\^/g, '- DOMAIN,$1');
  }

  if (text.match(/\b(?:(?:https?|ftp):\/\/)?\w[\w-]*(?:\.[\w-]+)+\b/g)) {
    return text.replace(
      /\b(?:(?:https?|ftp):\/\/)?\w[\w-]*(?:\.[\w-]+)+\b/g,
      '- DOMAIN,$&',
    );
  }

  return text.replace(/0\.0\.0\.0\s+([^\s]+)/g, '- DOMAIN,$1');
};

/**
 * The `downloadFile` function asynchronously downloads a file from a given URL and saves it to a
 * specified destination.
 * @param {string} url - The `url` parameter in the `downloadFile` function is the URL from which the
 * file needs to be downloaded.
 * @param {string} dest - The `dest` parameter in the `downloadFile` function represents the
 * destination path where the downloaded file will be saved on the local filesystem. It should be a
 * string that specifies the full path including the filename where you want to save the downloaded
 * file. For example, it could be something like `/path
 */
const downloadFile = async (url: string, dest: string) => {
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
    if (error instanceof Error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }

    throw new Error('Failed to save file');
  });
};

/**
 * The `processFile` function downloads a file from a URL, reads its content, modifies the data, and
 * writes the modified data to a new file.
 * @param {string} url - The `url` parameter in the `processFile` function represents the URL from
 * which the file needs to be downloaded and processed. It is a string that contains the address of the
 * file to be fetched.
 * @param {string} tempFileName - The `tempFileName` parameter in the `processFile` function represents
 * the name of the temporary file where the downloaded content will be stored before processing. This
 * file will be used to read the data, modify it, and then write the processed content to another file.
 * It acts as an intermediate storage location
 * @param {string} processedFileName - The `processedFileName` parameter in the `processFile` function
 * represents the name of the file where the processed data will be saved after modifying it. This file
 * will be stored in the `rulesFolder` directory.
 */
const processFile = async (
  url: string,
  tempFileName: string,
  processedFileName: string,
) => {
  try {
    await downloadFile(url, join(tempFolder, tempFileName));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    throw new Error('Failed to download file');
  }

  let readData: string;
  try {
    readData = await fsPromises.readFile(
      join(tempFolder, tempFileName),
      'utf-8',
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }

    throw new Error('Failed to read file');
  }

  const modifiedHeaderData = modifyHeader(readData);
  const modifiedDomainData = modifyDomain(modifiedHeaderData);

  try {
    await fsPromises.writeFile(
      join(rulesFolder, processedFileName),
      modifiedDomainData,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }

    throw new Error('Failed to write file');
  }

  console.log(`Successfully processed ${url}`);
};

const main = async () => {
  try {
    await ensureDirectoryExists(tempFolder);
    await ensureDirectoryExists(rulesFolder);

    for (const { url, tempFileName, processedFileName } of rawUrls) {
      await processFile(url, tempFileName, processedFileName);
    }

    await fsPromises.rm(tempFolder, { recursive: true });
    console.log('All files processed successfully');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`An error occurred: ${error.message}`);
    }

    throw new Error('An error occurred');
  }
};

void main();
