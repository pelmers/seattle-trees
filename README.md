# Seattle Tree Guide

## Website: [seattletrees.pelmers.com](https://seattletrees.pelmers.com)

![Example screenshot](/res/demo.png)

Source code for web site which shows all the street trees in Seattle on a
mobile-friendly map (rendered with [Mapbox](https://www.mapbox.com/)). Tapping
any tree icon brings up a summary of its Wikipedia article using
[MeaningCloud](https://www.meaningcloud.com/developer/apis).

Street tree data is sourced from SDOT's
[Urban Forestry Map](https://seattlecitygis.maps.arcgis.com/apps/MapSeries/index.html?appid=a7072ffa326c4ef39a0f031961ebace6).

Note that this repo doesn't include the data directly, see instructions for
downloading it in [`res/README.md`](/res/README.md).

### Build
```
yarn
yarn build
```

### Run
```
env MAPBOX_API_KEY=<Mapbox API KEY> MEANINGCLOUD_API_KEY=<MeaningCloud API Key> node dist/server.bundle.js
```
Additionally pass `--debug` to enable more logging at run time.