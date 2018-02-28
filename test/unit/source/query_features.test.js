import { test } from 'mapbox-gl-js-test';
import QueryFeatures from '../../../src/source/query_features.js';
import SourceCache from '../../../src/source/source_cache.js';

test('QueryFeatures#rendered', (t) => {
    t.test('returns empty object if source returns no tiles', (t) => {
        const mockSourceCache = { tilesIn: function () { return []; } };
        const result = QueryFeatures.rendered(mockSourceCache);
        t.deepEqual(result, []);
        t.end();
    });

    t.end();
});

test('QueryFeatures#source', (t) => {
    t.test('returns empty result when source has no features', (t) => {
        const sourceCache = new SourceCache('test', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        }, {
            send: function (type, params, callback) { return callback(); }
        });
        const result = QueryFeatures.source(sourceCache, {});
        t.deepEqual(result, []);
        t.end();
    });

    t.end();
});
