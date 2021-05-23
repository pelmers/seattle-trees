import express from 'express';
import compression from 'compression';
import favicon from 'serve-favicon';
import consoleStamp from 'console-stamp';
import io from 'socket.io';
import wiki, { Page } from 'wikijs';
import { TreeIndex } from './treeIndex';
import { d, question, r, time } from './utils';
import { Calls } from '../rpc/rpcCalls';
import util from 'util';
import fetch from 'node-fetch';
import fs from 'fs';
import { RpcServer, SocketTransport } from 'roots-rpc';

consoleStamp(console);

const app = express();
const port = 4055;
let mapboxApiKey = process.env['MAPBOX_API_KEY']!;
let meaningcloudApiKey = process.env['MEANINGCLOUD_API_KEY']!;

const dataFile = r('res/data.geojson');
// TODO support the arboretum tree data file, https://uw.maps.arcgis.com/home/webmap/viewer.html?webmap=ed25c6ffca99423bbc6a18a162e82187
const infoCacheFile = r('res/infoCache.json');
let infoCache: Map<string, { text: string; image: string; url: string }>;
async function loadInfoCache() {
    try {
        infoCache = new Map(
            JSON.parse((await util.promisify(fs.readFile)(infoCacheFile)).toString())
        );
        d(`Loaded ${infoCache.size} entries from cache`);
    } catch (e) {
        infoCache = new Map();
        d(`Could not load wiki info from cache: ${e.message}`);
    }
}
async function saveInfoCache() {
    try {
        await util.promisify(fs.writeFile)(
            infoCacheFile,
            JSON.stringify(Array.from(infoCache.entries()))
        );
    } catch (e) {
        d(`Could not save wiki info to file cache: ${e.message}`);
    }
}

async function main() {
    const helpIndex = process.argv.findIndex((arg) => arg === '-h' || arg === '--help');
    if (helpIndex > 0) {
        console.log(`Usage: server.bundle.js`);
        return;
    }
    if (mapboxApiKey == null || mapboxApiKey.length === 0) {
        mapboxApiKey = await question('Mapbox API key: ');
    }
    const treeIndex = await time('Load tree data file', TreeIndex.loadMap(dataFile));
    await time('load wiki info cache from file', loadInfoCache());

    app.use(compression());
    app.use(favicon(r('static/favicon.ico')));
    app.use('/static', express.static(r('static')));
    app.use('/dist', express.static(r('dist')));
    app.get('/', (_, res) => res.sendFile(r('static/index.html')));

    const server = app.listen(port, () => d(`Serving on :${port}`));

    io(server).on('connection', (socket) => {
        handleConnection(socket, treeIndex);
    });
}

function handleConnection(socket: io.Socket, treeIndex: TreeIndex) {
    d(
        `Client ${socket.id} (${JSON.stringify(
            socket.request.headers['user-agent']
        )}) connected to ${socket.request.url}`
    );
    const rpc = new RpcServer(new SocketTransport(socket));
    rpc.register(Calls.GetMapboxToken, async () => mapboxApiKey);
    rpc.register(Calls.GetMapBounds, async () => treeIndex.mapBounds);
    rpc.register(Calls.GetMapCenter, async () => treeIndex.getCenter());
    rpc.register(Calls.GetTreeInfoAtPoint, async ({ lng, lat }) => {
        const tree = treeIndex.getTreeAtPoint(lng, lat);
        if (!tree) {
            return null;
        }
        const { species } = tree;
        if (!infoCache.has(species)) {
            const page = await time(`find page for ${species}`, findPage(species));
            const [text, image] = await time(
                `load summary and imageUrl for ${species}`,
                Promise.all([summarize(page), page.mainImage()])
            );
            const url = page.url() || '';
            infoCache.set(species, {
                text: text || 'No description found',
                // TODO create a placeholder image url
                image: image || '',
                url,
            });
            await saveInfoCache();
        }
        const info = infoCache.get(species)!;
        return {
            tree,
            title: tree.name,
            description: info.text,
            imageUrl: info.image,
            pageUrl: info.url,
        };
    });
}

async function findPage(species: string): Promise<Page> {
    if (species.endsWith(' sp.')) {
        species = species.slice(0, -4);
    }
    try {
        const page = await wiki().find(species);
        if (page == null) {
            throw new Error('page is null');
        }
        return page;
    } catch (e) {
        const simplifiedSpecies = species.split(' ').slice(0, 2).join(' ');
        d(`wiki search error: ${e.message}, querying with ${simplifiedSpecies}`);
        return wiki().find(simplifiedSpecies);
    }
}

async function summarize(page: Page): Promise<string> {
    if (meaningcloudApiKey != null && meaningcloudApiKey.length > 0) {
        const url = `https://api.meaningcloud.com/summarization-1.0?key=${meaningcloudApiKey}&url=${page.url()}&sentences=5`;
        try {
            const resp = await fetch(url, { method: 'POST' });
            if (resp.status === 200) {
                const body = await resp.json();
                const { summary } = body;
                return (summary as string).replace(/\[\.\.\.\]/g, '');
            } else {
                throw new Error(
                    `invalid return code ${resp.status}: ${resp.statusText}`
                );
            }
        } catch (e) {
            d(`request to ${url} failed with ${e.message}`);
        }
    }
    return page.summary();
}

main();
