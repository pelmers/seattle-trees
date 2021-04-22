import * as t from 'io-ts';

const Bounds = t.type({
    n: t.number,
    s: t.number,
    e: t.number,
    w: t.number,
});
const Point = t.type({
    lng: t.number,
    lat: t.number,
});
const Tree = t.type({
    lat: t.number,
    lng: t.number,
    name: t.string,
    species: t.string,
});
const WikiInfo = t.union([
    t.nullType,
    t.type({
        pageUrl: t.string,
        imageUrl: t.string,
        description: t.string,
        title: t.string,
        tree: Tree,
    }),
]);

export type TBounds = t.TypeOf<typeof Bounds>;
export type TPoint = t.TypeOf<typeof Point>;
export type TTree = t.TypeOf<typeof Tree>;
export type TWikiInfo = t.TypeOf<typeof WikiInfo>;

export const Calls = {
    GetMapboxToken: () => ({
        i: t.null,
        o: t.string,
    }),
    GetMapBounds: () => ({
        i: t.null,
        o: Bounds,
    }),
    GetMapCenter: () => ({
        i: t.null,
        o: Point,
    }),
    GetTreeInfoAtPoint: () => ({
        i: Point,
        o: WikiInfo,
    }),
};
