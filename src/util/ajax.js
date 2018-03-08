// @flow

const window = require('./window');

const axios =  require('axios');

import type { Callback } from '../types/callback';

/**
 * The type of a resource.
 * @private
 * @readonly
 * @enum {string}
 */
const ResourceType = {
    Unknown: 'Unknown',
    Style: 'Style',
    Source: 'Source',
    Tile: 'Tile',
    Glyphs: 'Glyphs',
    SpriteImage: 'SpriteImage',
    SpriteJSON: 'SpriteJSON',
    Image: 'Image'
};
exports.ResourceType = ResourceType;

if (typeof Object.freeze == 'function') {
    Object.freeze(ResourceType);
}

/**
 * A `RequestParameters` object to be returned from Map.options.transformRequest callbacks.
 * @typedef {Object} RequestParameters
 * @property {string} url The URL to be requested.
 * @property {Object} headers The headers to be sent with the request.
 * @property {string} credentials `'same-origin'|'include'` Use 'include' to send cookies with cross-origin requests.
 */
export type RequestParameters = {
    url: string,
    headers?: Object,
    credentials?: 'same-origin' | 'include',
    collectResourceTiming?: boolean
};

class AJAXError extends Error {
    status: number;
    url: string;
    constructor(message: string, status: number, url: string) {
        super(message);
        this.status = status;
        this.url = url;

        // work around for https://github.com/Rich-Harris/buble/issues/40
        this.name = this.constructor.name;
        this.message = message;
    }

    toString() {
        return `${this.name}: ${this.message} (${this.status}): ${this.url}`;
    }
}

function makeRequest(requestParameters: RequestParameters): AxiosPromise {
    var headers = {};
    console.log("Building axios request");
    for (const k in requestParameters.headers) {
        headers[k] = requestParameters.headers[k];
    };

    const axiosRequest: AxiosPromise = new axios.get(requestParameters.url, headers);
    return axiosRequest;
}

exports.getJSON = function(requestParameters: RequestParameters, callback: Callback<mixed>) {
    const axiosRequest = makeRequest(requestParameters);

    axiosRequest.then(response => { 
        if (response.status >= 200 && response.status < 300 && response.data) {
            let data;
            try {
                console.log("Got a JSON request response. Data is:" + JSON.stringify(response.data));
                data = JSON.parse(response.data);
            } catch (err) {
                return callback(err);
            }
            callback(null, data);
        } else {
            callback(new AJAXError(response.statusText, response.status, requestParameters.url));
        }
    }).catch(rejection => { 

        console.log("Rejected: " + JSON.stringify(rejection));
        callback(new Error(rejection.response.status));
    })

    return xhr;
};

exports.getArrayBuffer = function(requestParameters: RequestParameters, callback: Callback<{data: ArrayBuffer, cacheControl: ?string, expires: ?string}>) {
    const axiosRequest = makeRequest(requestParameters);

    axiosRequest.then(response => {
        const arrayBuffer: ArrayBuffer = response.data;

        if (arrayBuffer.byteLength === 0 && response.status === 200) {
            return callback(new Error('http status 200 returned without content.'));
        }
        if (response.status >= 200 && response.status < 300 && response.data) {
            var data = new TextEncoder().encode(response.data);
            var buffer = data.buffer;
            
            callback(null, {
                data: buffer
            });
        } else {
            callback(new AJAXError(response.statusText, response.status, requestParameters.url));
        }
    }).catch(rejection => { 
        console.log("Rejected 2: " + JSON.stringify(rejection));
        callback(new Error(rejection.response.status));
    })
    
    return axiosRequest;
};

function sameOrigin(url) {
    const a: HTMLAnchorElement = window.document.createElement('a');
    a.href = url;
    return a.protocol === window.document.location.protocol && a.host === window.document.location.host;
}

const transparentPngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';

exports.getImage = function(requestParameters: RequestParameters, callback: Callback<HTMLImageElement>) {
    // request the image with XHR to work around caching issues
    // see https://github.com/mapbox/mapbox-gl-js/issues/1470
    return exports.getArrayBuffer(requestParameters, (err, imgData) => {
        if (err) {
            callback(err);
        } else if (imgData) {
            const img: HTMLImageElement = new window.Image();
            const URL = window.URL || window.webkitURL;
            img.onload = () => {
                callback(null, img);
                URL.revokeObjectURL(img.src);
            };
            const blob: Blob = new window.Blob([new Uint8Array(imgData.data)], { type: 'image/png' });
            (img: any).cacheControl = imgData.cacheControl;
            (img: any).expires = imgData.expires;
            img.src = imgData.data.byteLength ? URL.createObjectURL(blob) : transparentPngUrl;
        }
    });
};

exports.getVideo = function(urls: Array<string>, callback: Callback<HTMLVideoElement>) {
    const video: HTMLVideoElement = window.document.createElement('video');
    video.onloadstart = function() {
        callback(null, video);
    };
    for (let i = 0; i < urls.length; i++) {
        const s: HTMLSourceElement = window.document.createElement('source');
        if (!sameOrigin(urls[i])) {
            video.crossOrigin = 'Anonymous';
        }
        s.src = urls[i];
        video.appendChild(s);
    }
    return video;
};
