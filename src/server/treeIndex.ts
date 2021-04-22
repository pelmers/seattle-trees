import fs from 'fs';
import util from 'util';

import kdbush from 'kdbush';
import * as t from 'io-ts';

import { d } from './utils';
import { TBounds, TPoint, TTree } from '../rpc/rpcCalls';

export class TreeIndex {
    public mapBounds: TBounds = {
        n: Number.MIN_SAFE_INTEGER,
        s: Number.MAX_SAFE_INTEGER,
        e: Number.MIN_SAFE_INTEGER,
        w: Number.MAX_SAFE_INTEGER,
    };
    private index: KDBush<TTree>;

    private constructor(trees: TTree[]) {
        this.index = new kdbush(
            trees,
            (t) => t.lat,
            (t) => t.lng
        );
        for (const t of trees) {
            this.mapBounds.n = Math.max(t.lat, this.mapBounds.n);
            this.mapBounds.s = Math.min(t.lat, this.mapBounds.s);
            this.mapBounds.e = Math.max(t.lng, this.mapBounds.e);
            this.mapBounds.w = Math.min(t.lng, this.mapBounds.w);
        }
    }

    public getCenter(): TPoint {
        return {
            lat: (this.mapBounds.n + this.mapBounds.s) / 2,
            lng: (this.mapBounds.e + this.mapBounds.w) / 2,
        };
    }

    public getTreeAtPoint(lng: number, lat: number): TTree | null {
        const r = 0.0002;
        const ids = this.index.within(lat, lng, r);
        let minD = Number.MAX_SAFE_INTEGER;
        let minT = null;
        for (const id of ids) {
            const t = this.index.points[id];
            const diff =
                Math.pow(Math.abs(t.lng - lng), 2) + Math.pow(Math.abs(t.lat - lat), 2);
            if (diff < minD) {
                minD = diff;
                minT = t;
            }
        }
        return minT;
    }

    static async loadMap(dataFile: string): Promise<TreeIndex> {
        const geojson = JSON.parse(
            (await util.promisify(fs.readFile)(dataFile)).toString()
        );
        const trees: TTree[] = geojson.features.map(
            (feat: {
                geometry: { coordinates: [number, number] };
                properties: { COMMON_NAME: string; SCIENTIFIC_NAME: string };
            }) => {
                const [lng, lat] = feat.geometry.coordinates;
                return {
                    lng,
                    lat,
                    name: feat.properties.COMMON_NAME,
                    species: feat.properties.SCIENTIFIC_NAME,
                };
            }
        );
        return new TreeIndex(trees);
    }
}
