import { cancelable, CancelablePromiseType } from 'cancelable-promise';
import mapboxgl from 'mapbox-gl';
import { TPoint, TWikiInfo } from '../../rpc/rpcCalls';
import {
    getMapBounds,
    getMapboxToken,
    getMapCenter,
    getTreeInfoAtPoint,
} from '../connect';

function addLocationPopup(loc: mapboxgl.LngLatLike, map: mapboxgl.Map, center: TPoint) {
    const $popup = document.createElement('div');
    const $btn = document.createElement('button');
    $btn.textContent = 'Yes';
    $popup.textContent = 'No objects nearby. Move map to where there is data?';
    $popup.appendChild(document.createElement('br'));
    $popup.appendChild($btn);
    $popup.classList.add('location-popup-contents');
    const popup = new mapboxgl.Popup({ maxWidth: '50vw' })
        .setLngLat(loc)
        .setDOMContent($popup)
        .addTo(map);
    $btn.addEventListener('click', () => {
        map.flyTo({ center });
        popup.remove();
    });
}

function addTreePopup(loc: mapboxgl.LngLatLike, map: mapboxgl.Map, info: TWikiInfo) {
    const maxWidth = '64vw';
    new mapboxgl.Popup({ maxWidth, anchor: 'top' })
        .setHTML(
            `
<div class="tree-popup-contents">
    <a href="${info!.pageUrl}" target="_blank"><b>${info!.title}</b></a><br>
    <i>${info!.tree.species}</i><br>
    <img src="${
        info!.imageUrl
    }" style="float: right; max-height: 200px; max-width: calc(${maxWidth} - 7em);"></img>
    <p>${info!.description}
</div>
    `
        )
        .setLngLat(loc)
        .addTo(map);
}

async function main() {
    const [center, bounds, token] = await Promise.all([
        getMapCenter(),
        getMapBounds(),
        getMapboxToken(),
    ]);
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container: 'map-container',
        zoom: 10,
        center: [center.lng, center.lat],
        style: 'mapbox://styles/pelmers/cknbqmrbu0x3417pbmb3ceuo4',
    });
    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        fitBoundsOptions: { minZoom: 17 },
        trackUserLocation: true,
    });
    geolocate.on('geolocate', (e: any) => {
        const { coords } = e;
        if (coords) {
            const { latitude, longitude } = coords;
            if (
                latitude > bounds.n ||
                latitude < bounds.s ||
                longitude > bounds.e ||
                longitude < bounds.w
            ) {
                addLocationPopup([longitude, latitude], map, center);
            }
        }
    });
    map.addControl(geolocate);
    map.on('load', () => {
        const $info = document.createElement('span');
        const $infoAnchor = document.createElement('a');
        $infoAnchor.href =
            'https://seattlecitygis.maps.arcgis.com/apps/MapSeries/index.html?appid=a7072ffa326c4ef39a0f031961ebace6';
        $infoAnchor.innerText = 'View data source';
        $info.style.marginLeft = '12px';
        $info.style.padding = '10px';
        $info.style.backgroundColor = 'hsla(0,0%,100%,.5)';
        $info.appendChild($infoAnchor);
        const $bottomLeft = document.querySelector('.mapboxgl-ctrl-bottom-left');
        $bottomLeft && $bottomLeft.appendChild($info);
        geolocate.trigger();
    });
    let currentRequest: CancelablePromiseType<TWikiInfo> | null = null;
    map.on('click', 'trees-layer', async (e) => {
        const { lngLat } = e;
        // Only allow 1 request in flight at a time (note this doesn't cancel all the way to the server)
        if (currentRequest != null) {
            currentRequest.cancel();
        }
        const thisRequest = cancelable(getTreeInfoAtPoint(lngLat));
        currentRequest = thisRequest;
        let info: TWikiInfo | null = null;
        let wasError = false;
        try {
            info = await thisRequest;
        } catch (e) {
            console.error('info request failed', e);
            wasError = true;
        }
        if (currentRequest === thisRequest) {
            // If we completed successfully and nothing interrupted,
            // then unset currentRequest so next call doesn't send cancel()
            // on an already fulfilled promise
            currentRequest = null;
            if (!wasError) {
                addTreePopup(lngLat, map, info);
            }
        }
    });
}

main();
