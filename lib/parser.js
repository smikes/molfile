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

    /**
     Parser for MDL/Symyx CTfile formats

     Usage:
         var molfile = require('molfile');

         var parsed = molfile.parseMol(string);

     @module molfile
     @class  molfile

     */

    /**
     Return parser version string.

     @method getVersion
     @return {String} parser version
     */
    parser.getVersion = function getVersion() {
        return {
            moduleVersion: '0.0.2'
        };
    };

    /**
     * Parse the count line of a V2000 format molFile.  Returns an object:
     *
     *     {
     *       'atoms': 15,
     *       'bonds': 14,
     *       'chiral': 1,
     *       'mLines': 999,
     *       'version': ' V2000'
     *     }
     *
     * Note that mLines should always be 999 for modern molfiles,
     * to signal the mLines value is ignored.  M lines are read until 'M  END'.
     *
     * Note that version will contain leading spaces if the version string
     * is shorter than the 6 bytes alloted.
     *
     * @method parseCountLine
     * @param {String} line count line to parse
     * @return {Object} data from the line
     */
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

    /**
     Parses an atom line.  Return value is an object:

          {
             'x': 0.0,
             'y': 0.0,
             'z': 0.0,
             'elname': 'Hf'
             'massDiff': 0,
             'chargeCode': 0,
             'valenceCode': 0,
           }

     Note that massDiff, chargeCode and valenceCode should be ignored if there
     are isotope, charge, or radical entries in the property table which
     follows the atom and bond tables.

     It is easier to read the isotope, charge, and radical information
     from the properties than to interpret the codes.

     Mass difference is an integral difference from the periodic table mass,
     and is in the range -3..4

     Charge code should be interpreted as follows:

     | Code   |  Meaning |
     |-------|---------|
     |      0 | no charge (0)|
     |      1 |       +3 |
     |      2 |       +2 |
     |      3 |       +1 |
     |      4 | doublet (radical) |
     |      5 |       -1 |
     |      6 |       -2 |
     |      7 |       -3 |

     Valence code should be interpreted as follows:

     | Code   |  Meaning |
     |-------|---------|
     |      0 | default valence |
     |   1-14 | valence = code |
     |    15 |  valence = 0 |

     @method parseAtomLine
     @param {String} line the line to parse
     @return {Object} data from the line
     */
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

    /**
     Parses a bond line.  Return value is an object:

          {
            'from': 3,
            'to': 4,
            'bondType': 1
          }

     bondType is a code, and should be interpreted as follows:

     | Code | Meaning |
     |------|---------|
     | 1 | single |
     | 2 | double |
     | 3 | triple |
     | 4 | aromatic |
     | 5 | single or double |
     | 6 | single or aromatic |
     | 7 | double or aromatic |
     | 8 | any |

     Codes 5-8 are can only be present when the file describes a
     search.  They are never present in a molecule description.

     @method parseBondLine
     @param {String} line the line to parse
     @return {Object} data from the line
     */
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

    /**
     Parses a property line

     @method parseProperty
     @param {String} line the line to parse
     @return {Object} data from the line
     */
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

    /**
     Prescan the molfile data, find the newlines and boundaries of various
     blocks.  Returns an object:

         {
           newlines: [],     // offset of each newline
           firstM: 120,      // beginning of properties
           lastM: 154,       // end of properties
           firstAngle: 230,  // beginning of data
           sectionEnd: 500   // end of data
         }

     @method prescanMol
     @param {String} mol the molfile data
     @return {Object} object containing useful offsets
     */
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

    /**
     Parses a V2000 molfile record and returns an Object containing
     the data therein.

          {
              atoms: [
                { x: 0.0, y: 0.0, z: 0.0, elname: 'Hf' }
                ...
              ],
              bonds: [
                  { 3, 4, 1 },
                  ...
              }
              properties: {
                  CHG: {
                     3: -1
                  }
                  ISO: {
                  }
                  RAD: {
                  }
              }
              data: {
                ID: 'zwitterions_2'
             }
           }


     @method parseMol
     @param {String} mol the complete molfile, including newlines
     @return {Object} an object representing the contents of the molfile
     */
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

    /**
     A Transform stream that splits an SDF file into individual MOL
     file segments and pushes the segments to the output of the stream

     @class SDFTransform
     */

    /**
     Constructs a new SDFTransform

     @constructor
     @method SDFTransform
     @return {SDFTransform}
     */
    function SDFTransform() {
        stream.Transform.call(this);

        this.buffer = "";
    }
    util.inherits(SDFTransform, stream.Transform);

    /*jslint nomen:true, unparam:true*/
    SDFTransform.prototype._transform = function (chunk, unused, callback) {
        this.buffer += chunk;

        var parts = this.buffer.split(/\$\$\$\$\r?\n/m);

        // remove last (partial) sdf file
        this.buffer = parts.pop();

        parts.forEach(function (part) {
            this.push(part);
        }.bind(this));

        callback(null);
    };

    SDFTransform.prototype._flush = function (callback) {
        if (this.buffer.length > 1) {
            this.push(this.buffer);
        }

        callback(null);
    };
    /*jslint nomen:false, unparam:true*/

    parser.SDFTransform = SDFTransform;


    /**
     A Writable stream that splits an SDF file into individual MOL file segments
     suitable for passing to parseMol.

     Output is via callback.  See SDFTransform for output via Streams API

     @class SDFSplitter
     */

    /**

     @constructor
     @method SDFSplitter
     @param {Function} callback function to call with molfile data
     @return {SDFSplitter} a Writable stream which calls the supplied callback
     once per molfile in the supplied SDFSplitter stream
     */
    function SDFSplitter(handler) {
        parser.SDFTransform.call(this);

        this.on('data', function (chunk) {
            handler(String(chunk));
        });
    }
    util.inherits(SDFSplitter, SDFTransform);

    parser.SDFSplitter = SDFSplitter;

}());
