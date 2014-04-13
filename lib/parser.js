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
            moduleVersion: '0.0.1'
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

        parsed.x = parseFloat(line.slice(0, 10));
        parsed.y = parseFloat(line.slice(10, 20));
        parsed.z = parseFloat(line.slice(20, 30));
        // 31 is declared as a space
        parsed.elname = line.slice(31, 34).trim();
        parsed.massDiff = parseInt(line.slice(34, 36), 10);
        parsed.chargeCode = parseInt(line.slice(36, 39), 10);
        // several obsolete fields
        parsed.valenceCode = parseInt(line.slice(48, 51), 10);
        // more obsolete fields

        return parsed;
    };

    parser.parseBondLine = function (line) {
        var parsed = { from: 0, to: 0, bondType: 0 };

        parsed.from = parseInt(line.slice(0, 3), 10);
        parsed.to = parseInt(line.slice(3, 6), 10);
        parsed.bondType = parseInt(line.slice(6, 9), 10);
        // several other fields, all obsolete

        return parsed;
    };

    parser.addKeyValue = function addKeyValue(values, part) {
        var key = parseInt(part.slice(0, 4), 10),
            value = parseInt(part.slice(4, 8), 10);
        values[key] = value;
    };

    parser.parseProperty = function parseProperty(line) {
        if (/^M {2}END$/.test(line)) {
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
            offset = 9 + i * 8;
            slices.push(line.slice(offset, offset + 8));
        }

        slices.forEach(function (slice) {
            parser.addKeyValue(values, slice);
        });

        return parsed;
    };

    parser.makeDate = function makeDate(line) {
        var month = parseInt(line.slice(0, 2), 10),
            day = line.slice(2, 4),
            year = parseInt(line.slice(4, 6), 10),
            hour = line.slice(6, 8),
            minute = line.slice(8, 10);

        if (year < 80) {
            year += 2000;
        }

        return new Date(year, month - 1, day, hour, minute);
    };

    parser.parseMolHeader = function parseMolHeader(header) {
        var parsed = {},
            lines = header.split('\n');

        parsed.name = lines[0];
        parsed.initials = lines[1].slice(0, 2);
        parsed.software = lines[1].slice(2, 10);
        parsed.date = parser.makeDate(lines[1].slice(10, 20));
        parsed.comment = lines[2];

        return parsed;
    };

    parser.parseDataItem = function parseDataItem(string) {
        var parsed = {},
            match,
            from,
            to;

        match = /<([\-A-Za-z_\.]+)>/.exec(string);
        parsed.name = match ? match[1] : '';

        from = string.indexOf('\n');
        to = string.length;
        parsed.value = string.slice(from + 1, to);

        return parsed;
    };

    parser.splitDataItems = function splitDataItems(string) {
        // between M  END and $$$, split on double newline
        return string.split('\n\n');
    };

    parser.prescanMol = function prescanMol(mol) {
        var scan = { newlines: [] },
            start = 0,
            len = mol.length,
            found = -1,
            line;

        while (start < len) {
            found = mol.indexOf('\n', start);
            if (found === -1) {
                break;
            }
            scan.newlines.push(found);

            line = mol.slice(start, found);

            if (line.match(/^M {2}END/)) {
                scan.lastM = start;
            }
            if (line.match(/^M/) && !scan.firstM) {
                scan.firstM = start;
            }
            if (line.match(/^>/) && !scan.firstAngle) {
                scan.firstAngle = start;
            } else if (line.match(/^\$\$\$/)) {
                scan.sectionEnd = start;
            }

            start = found + 1;
        }

        return scan;
    };

    function getAtoms(mol, scan, parsed) {
        var begin = scan.newlines[3] + 1,
            end = scan.newlines[3 + parsed.countLine.atoms],
            atomLines = mol.slice(begin, end);

        return atomLines.split('\n');
    }

    function getBonds(mol, scan, parsed) {
        var startLine = 3 + parsed.countLine.atoms,
            begin = scan.newlines[startLine] + 1,
            end = scan.newlines[startLine + parsed.countLine.bonds];

        return mol.slice(begin, end).split('\n');
    }

    function getProperties(mol, scan) {
        var begin = scan.firstM,
            end = scan.lastM;

        return mol.slice(begin, end).split('\n');
    }

    function getData(mol, scan) {
        var begin = scan.firstAngle,
            end = scan.sectionEnd;

        return mol.slice(begin, end).split('\n\n');
    }

    function squashProperty(accum, property) {
        var mode = property.mode,
            source,
            target;

        if (!accum[mode]) {
            accum[mode] = property[mode];
        } else {
            target = accum[mode];
            source = property[mode];

            Object.keys(source).forEach(function (key) {
                target[key] = source[key];
            });
        }

        return accum;
    }
    parser.squashProperty = squashProperty;

    function squashData(accum, data) {
        if (data.name) {
            accum[data.name] = data.value;
        }

        return accum;
    }

    parser.parseMol = function parseMol(mol) {
        var parsed = {},
            scan = parser.prescanMol(mol),
            headerEnd = scan.newlines[2] + 1,
            countLineEnd = scan.newlines[3] + 1;

        parsed.header = parser.parseMolHeader(mol.slice(0, headerEnd));

        parsed.countLine = parser.parseCountLine(mol.slice(headerEnd, countLineEnd));

        parsed.atoms = getAtoms(mol, scan, parsed).map(parser.parseAtomLine);

        parsed.bonds = getBonds(mol, scan, parsed).map(parser.parseBondLine);

        // now read properties
        parsed.properties = getProperties(mol, scan).map(parser.parseProperty)
            .reduce(squashProperty, {});

        parsed.data = getData(mol, scan).map(parser.parseDataItem)
            .reduce(squashData, {});

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

        var parts = this.buffer.split(/\$\$\$\$\n/m);

        // remove last (partial) sdf file
        this.buffer = parts.pop();

        parts.forEach(this.handler);

        callback(null);
    };
    /*jslint nomen:false*/

    parser.SDFSplitter = SDFSplitter;

}());
