/* parser.js
 * Copyright 2014 Cubane Canada, Inc.
 *
 * Released under the MIT license -- see MIT-LICENSE for details
 */
(function () {
    'use strict';

    var parser = exports,
        util = require('util'),
        stream = require('stream');


    parser.getVersion = function getVersion() {
        return {
            moduleVersion: '0.0.0'
        };
    };
    parser.parseCountLine = function parseCountLine(line) {
        var parsed = {};

        parsed.atoms = parseInt(line.slice(0, 3), 10);
        parsed.bonds = parseInt(line.slice(3, 6), 10);
        // atom lists: 6-9
        // obsolete:   9-12
        parsed.chiral = parseInt(line.slice(12, 15), 10);
        // stexts:    15-18
        // obsolete:  18-21
        // obsolete:  21-24
        // obsolete:  24-27
        // obsolete:  27-30
        parsed.mLines = parseInt(line.slice(30, 33), 10);
        parsed.version = line.slice(33, 39);

        if (parsed.version !== " V2000") {
            throw new Error("Unsupported molfile version '" + parsed.version + "'");
        }

        return parsed;
    };

    parser.parseAtomLine = function (line) {
        var parsed = { x: 0, y: 0, z: 0 };

        parsed.x = parseFloat(line.slice(0,10));
        parsed.y = parseFloat(line.slice(10,20));
        parsed.z = parseFloat(line.slice(20,30));
        // 31 is declared as a space
        parsed.elname = line.slice(31,34).trim();
        parsed.massDiff = parseInt(line.slice(34,36), 10);
        parsed.chargeCode = parseInt(line.slice(36,39), 10);
        // several obsolete fields
        parsed.valenceCode = parseInt(line.slice(48,51), 10);
        // more obsolete fields

        return parsed;
    };

    parser.parseBondLine = function (line) {
        var parsed = { from: 0, to: 0, bondType: 0 };

        parsed.from = parseInt(line.slice(0,3), 10);
        parsed.to = parseInt(line.slice(3,6), 10);
        parsed.bondType = parseInt(line.slice(6,9), 10);
        // several other fields, all obsolete

        return parsed;
    };

    parser.addKeyValue = function addKeyValue(values, part) {
        var key = parseInt(part.slice(0, 4), 10),
            value = parseInt(part.slice(4, 8), 10);
        values[key] = value;
    };

    parser.parseProperty = function parseProperty(line) {
        if (/^M  END$/.test(line)) {
            return null;
        }

        var parsed = {},
            values = {},
            i,
            slices = [],
            offset;

        parsed.mode = line.slice(3, 6);
        parsed[parsed.mode] = values;
        parsed.count = parseInt(line.slice(6, 9), 10);

        for (i = 0; i < parsed.count; i += 1) {
            offset = 9 + i*8;
            slices.push(line.slice(offset, offset+8));
        }

        slices.forEach(function (slice) {
            parser.addKeyValue(values, slice);
        });

        return parsed;
    };

    parser.makeDate = function makeDate(line) {
        var month = line.slice(0,2),
            day = line.slice(2,4),
            year = parseInt(line.slice(4,6), 10),
            hour = line.slice(6,8),
            minute = line.slice(8,10);

        if (year < 80) {
            year += 2000;
        }

        return new Date(year,month,day,hour,minute);
    };

    parser.parseMolHeader = function parseMolHeader(header) {
        var parsed = {};

        var lines = header.split('\n');
        parsed.name = lines[0];
        parsed.initials = lines[1].slice(0,2);
        parsed.software = lines[1].slice(2,10);
        parsed.date = parser.makeDate(lines[1].slice(10,20));
        parsed.comment = lines[2];

        return parsed;
    };

    function SDFSplitter_finish() {
        if (this.buffer.length > 1) {
            this.handler(this.buffer);
        }
    }

    function SDFSplitter(handler) {
        stream.Writable.call(this);

        this.buffer = "";
        this.handler = handler;

        this.on('finish', SDFSplitter_finish);
    }
    util.inherits(SDFSplitter, stream.Writable);

    /*jslint nomen:true*/
    SDFSplitter.prototype._write = function (chunk, unused, callback) {
        this.buffer += chunk;

        var parts = this.buffer.split(/^\$\$\$\$$/m);

        // remove last (partial) sdf file
        this.buffer = parts.pop();

        parts.forEach(this.handler);

        callback(null);
    };
    /*jslint nomen:false*/

    parser.SDFSplitter = SDFSplitter;

}());
