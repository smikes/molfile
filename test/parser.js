/*globals: it, describe*/
require('should');
var fs = require('fs'),
    sinon = require('sinon'),
    parser = require('../lib/parser');

function dateMatch(d1, d2) {
    return Math.abs(d1.getTime() - d2.getTime()) < 1000*60*60*24;
}

describe('parser', function() {
    describe('getVersion', function () {
        it('should be a function', function () {
            (parser.getVersion).should.be.a.Function;
        });
        it('should have a version matching package.json', function (done) {
            var fs = require('fs');

            function afterRead(err, data) {
                var p = JSON.parse(data),
                    version = parser.getVersion();

                (version.moduleVersion).should.be.exactly(p.version);
                done();
            }

            fs.readFile('package.json', afterRead);
        });
    });
    describe('parseCountLine', function () {
        it('should parse trivial count lines', function () {
            var parsed = parser.parseCountLine('  1  0  0  0  0  0  0  0  0  0999 V2000');

            parsed.should.have.property('atoms', 1);
            parsed.should.have.property('bonds', 0);
            parsed.should.have.property('chiral', 0);
            parsed.should.have.property('mLines', 999);
            parsed.should.have.property('version', ' V2000');
        });
        it('should parse more complicated count lines', function () {
            var parsed = parser.parseCountLine('243257  0  0  0  0  0  0  0  0999 V2000');

            parsed.should.have.property('atoms', 243);
            parsed.should.have.property('bonds', 257);
        });
        it('should occasionally see the chiral flag', function () {
            var parsed = parser.parseCountLine(' 86 90  0  0  1  0  0  0  0  0999 V2000');

            parsed.should.have.property('chiral', 1);
        });
        it('should only support version V2000', function () {
            (function () {
                var parsed = parser.parseCountLine(' 86 90  0  0  1  0  0  0  0  0999 V2001');
            }).should.throw("Unsupported molfile version ' V2001'");
        });
        it('should handle lots of atoms', function () {
            var parsed = parser.parseCountLine('319213  0  0  0  0  0  0  0  0999 V2000');

            parsed.should.have.property('atoms', 319);
            parsed.should.have.property('bonds', 213);
        });
    });
    describe('parseAtomLine', function () {
        it('should parse trivial atom lines', function () {
            var parsed = parser.parseAtomLine('    4.5375   -6.9250    0.0000 Mn  0  0  0  0  0  0  0  0  0  0  0  0');

            (parsed.x).should.be.approximately(4.5375, 0.001);
            (parsed.y).should.be.approximately(-6.9250, 0.001);
            (parsed.z).should.be.approximately(0.0000, 0.001);
            (parsed.elname).should.be.exactly('Mn');
            (parsed.massDiff).should.be.exactly(0);
            (parsed.chargeCode).should.be.exactly(0);
            (parsed.valenceCode).should.be.exactly(0);
        });

        it('should handle uncommon fields - massDiff', function () {
            // atomline isotope
            var atomLine = '    0.3292    1.1458    0.0000 H   2  0  0  0  0  0  0  0  0  0  0  0';
            var parsed = parser.parseAtomLine(atomLine);

            (parsed.elname).should.be.exactly('H');
            (parsed.massDiff).should.be.exactly(2);
            (parsed.chargeCode).should.be.exactly(0);
            (parsed.valenceCode).should.be.exactly(0);
        });

        it('should handle uncommon fields - massDiff', function () {
            // atomline charge
            var atomLine = '   12.0333  -13.9208    0.0000 Ag  0  5  0  0  0  0  0  0  0  0  0  0';
            var parsed = parser.parseAtomLine(atomLine);

            (parsed.elname).should.be.exactly('Ag');
            (parsed.massDiff).should.be.exactly(0);
            (parsed.chargeCode).should.be.exactly(5);
            (parsed.valenceCode).should.be.exactly(0);
        });

        it('should handle uncommon fields - chargeCode', function () {
            // atomline charge
            var atomLine = '   12.0333  -13.9208    0.0000 Ag  0  5  0  0  0  0  0  0  0  0  0  0';
            var parsed = parser.parseAtomLine(atomLine);

            (parsed.elname).should.be.exactly('Ag');
            (parsed.massDiff).should.be.exactly(0);
            (parsed.chargeCode).should.be.exactly(5);
            (parsed.valenceCode).should.be.exactly(0);
        });

        it('should handle uncommon fields - valenceCode 15', function () {
            // atomline valence
            var atomLine = '   12.0333  -13.9208    0.0000 Ag  0  0  0  0  0 15000  0  0  0  0  0';
            var parsed = parser.parseAtomLine(atomLine);

            (parsed.elname).should.be.exactly('Ag');
            (parsed.massDiff).should.be.exactly(0);
            (parsed.chargeCode).should.be.exactly(0);
            (parsed.valenceCode).should.be.exactly(15);
        });

        it('should handle uncommon fields - valenceCode 1', function () {
            // atomline valence
            var atomLine = '   12.0333  -13.9208    0.0000 Ag  0  0  0  0  0  1000  0  0  0  0  0';
            var parsed = parser.parseAtomLine(atomLine);

            (parsed.elname).should.be.exactly('Ag');
            (parsed.massDiff).should.be.exactly(0);
            (parsed.chargeCode).should.be.exactly(0);
            (parsed.valenceCode).should.be.exactly(1);
        });

        it('should handle large coordinate values', function () {
            var atomLine = '  282.0000 1003.3766    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0';

            var parsed = parser.parseAtomLine(atomLine);

            (parsed.x).should.be.approximately(282.0, 0.001);
            (parsed.y).should.be.approximately(1003.3766, 0.001);
            (parsed.z).should.be.approximately(0.0000, 0.001);
            (parsed.elname).should.be.exactly('N');
        });

        it('should handle three-letter atom names', function () {
            var atomLine = '  282.0000 1003.3766    0.0000 Uns 0  0  0  0  0  0  0  0  0  0  0  0';

            var parsed = parser.parseAtomLine(atomLine);

            (parsed.x).should.be.approximately(282.0, 0.001);
            (parsed.y).should.be.approximately(1003.3766, 0.001);
            (parsed.z).should.be.approximately(0.0000, 0.001);
            (parsed.elname).should.be.exactly('Uns');
        });
    });
    describe('parseBondLine', function () {
        it('should handle a simple bond line', function () {
            var bondLine = '  1  2  1  0  0  0  0',
                parsed = parser.parseBondLine(bondLine);

            (parsed.from).should.be.exactly(1);
            (parsed.to).should.be.exactly(2);
            (parsed.bondType).should.be.exactly(1);
        });
        it('should handle a many atoms aromatic bond line', function () {
            var bondLine = ' 11202  4  0  0  0  0',
                parsed = parser.parseBondLine(bondLine);

            (parsed.from).should.be.exactly(11);
            (parsed.to).should.be.exactly(202);
            (parsed.bondType).should.be.exactly(4);
        });
    });

    describe('parseProperty', function () {
        it('should recognize a the properties end', function () {
            var propertiesLine = 'M  END',
                parsed = parser.parseProperty(propertiesLine);

            (parsed === null).should.be.true;
        });

        it('should recognize a properties block', function () {
            var propertiesLine = 'M  CHG  4   2   1   6  -1  29   1  32  -1',
                parsed = parser.parseProperty(propertiesLine);

            (parsed === null).should.be.false;
            (parsed.CHG).should.be.an.Object;
            (parsed.CHG).should.have.property(2, 1);
            (parsed.CHG).should.have.property(6, -1);
            (parsed.CHG).should.have.property(29, 1);
            (parsed.CHG).should.have.property(32, -1);
        });

        it('should be able to parse a key and value out of a string', function () {
            var keyValue = "   2   1",
                obj = {};

            parser.addKeyValue(obj, keyValue);

            obj.should.have.property(2, 1);
        });

        it('should recognize a properties block (chg 8)', function () {
            var propertiesLine = 'M  CHG  8   5  -1   6  -1  12   1  15  -1  16  -1  20   1  24   1  27  -1',
                parsed = parser.parseProperty(propertiesLine);

            (parsed === null).should.be.false;
            (parsed.CHG).should.be.an.Object;
            (parsed.CHG).should.have.property(5, -1);
            (parsed.CHG).should.have.property(27, -1);
        });

        it('should recognize a properties block (rad 3)', function () {
            var propertiesLine = 'M  RAD  3  14   3  16   2  18   1',
                parsed = parser.parseProperty(propertiesLine);

            (parsed === null).should.be.false;
            (parsed.RAD).should.be.an.Object;
            (parsed.RAD).should.have.property(14, 3);
            (parsed.RAD).should.have.property(16, 2);
            (parsed.RAD).should.have.property(18, 1);
        });

        it('should recognize a properties block (iso 5)', function () {
            var propertiesLine = 'M  ISO  5  13   2  15  17  22  13  26   2  27   2',
                parsed = parser.parseProperty(propertiesLine);

            (parsed === null).should.be.false;
            (parsed.count).should.be.exactly(5);
            (parsed.ISO).should.be.an.Object;
            (parsed.ISO).should.have.property(13, 2);
            (parsed.ISO).should.have.property(15, 17);
            (parsed.ISO).should.have.property(27, 2);
        });

    });


    describe('parseMolHeader', function () {
        it('should interpret the header line', function () {
            var header = "\n  Mol2Comp06180618072D\n\n",
                parsed = parser.parseMolHeader(header);

            (parsed === null).should.be.false;
            (parsed.name).should.be.exactly('');
            (parsed.comment).should.be.exactly('');
            (parsed.initials).should.be.exactly('  ');
            (parsed.software).should.be.exactly('Mol2Comp');
            dateMatch(parsed.date, new Date('2006-06-18T18:07')).should.be.ok;
        });
    });

    describe('parseDataItem', function () {
        it('should interpret a data item', function () {
            var dataItem = '>  <ID>\n_Elements.#018',
                parsed = parser.parseDataItem(dataItem);

            (parsed.name).should.equal('ID');
            (parsed.value).should.equal('_Elements.#018');
        });
        it('should interpret a data item (ID 2)', function () {
            var dataItem = '>  <ID>\nzwitterions_2',
                parsed = parser.parseDataItem(dataItem);

            (parsed.name).should.equal('ID');
            (parsed.value).should.equal('zwitterions_2');
        });
        it('should interpret a data item (PUBCHEM CID)', function () {
            var dataItem = '> <PUBCHEM_COMPOUND_CID>\n1',
                parsed = parser.parseDataItem(dataItem);

            (parsed.name).should.equal('PUBCHEM_COMPOUND_CID');
            (parsed.value).should.equal('1');
        });
        it('should interpret a multiline data item (PUBCHEM COORD TYPE)', function () {
            var dataItem = '> <PUBCHEM_COORDINATE_TYPE>\n1\n5\n255',
                parsed = parser.parseDataItem(dataItem);

            (parsed.name).should.equal('PUBCHEM_COORDINATE_TYPE');
            (parsed.value).should.equal('1\n5\n255');
        });
        it('should interpret a long data item (PUBCHEM CACTVS SUBSKEYS)', function () {
            var dataItem = '> <PUBCHEM_CACTVS_SUBSKEYS>\nAAADceByOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAACBThgAYCCAMABAAIAACQCAAAAAAAAAAAAAEIAAACABQAgAAHAAAFIAAQAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
                parsed = parser.parseDataItem(dataItem);

            (parsed.name).should.equal('PUBCHEM_CACTVS_SUBSKEYS');
            (parsed.value).should.equal('AAADceByOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAACBThgAYCCAMABAAIAACQCAAAAAAAAAAAAAEIAAACABQAgAAHAAAFIAAQAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
        });
    });

    describe('splitDataItems', function () {
        it('should split a string into an array of data items', function () {
            var dataItems = '> <PUBCHEM_TOTAL_CHARGE>\n0\n\n> <PUBCHEM_HEAVY_ATOM_COUNT>\n14\n\n> <PUBCHEM_ATOM_DEF_STEREO_COUNT>\n0\n\n',
                items = parser.splitDataItems(dataItems);

            (items[0]).should.equal('> <PUBCHEM_TOTAL_CHARGE>\n0');
        });
    });


    describe('parseMol', function () {
        it('should parse a complete mol file', function (done) {
            fs.readFile('test/fixtures/single.sdf', function (err, buf) {
                var file = String(buf),
                    parsed = parser.parseMol(file);

                (parsed === undefined).should.be.false;
                (parsed.header).should.have.property('name', '');
                (parsed.header).should.have.property('software', 'Mol2Comp');
                (parsed.countLine).should.have.property('atoms', 1);
                (parsed.countLine).should.have.property('bonds', 0);
                (parsed.countLine).should.have.property('version', ' V2000');

                (parsed.atoms.length).should.equal(parsed.countLine.atoms);
                (parsed.atoms[0]).should.have.property('elname', 'Mn');
                (parsed.atoms[0]).should.have.property('x', 4.5375);
                done();
            });
        });
        it('should parse a complex mol file', function () {
            var file = String(fs.readFileSync('test/fixtures/zwitterion.sdf')),
                parsed = parser.parseMol(file);

            (parsed === undefined).should.be.false;
            (parsed.header).should.have.property('name', '');
            (parsed.header).should.have.property('software', '-ClnMol-');
            (parsed.countLine).should.have.property('atoms', 243);
            (parsed.countLine).should.have.property('bonds', 257);
            (parsed.countLine).should.have.property('version', ' V2000');

            (parsed.atoms.length).should.equal(parsed.countLine.atoms);
            (parsed.atoms[0]).should.have.property('elname', 'C');
            (parsed.atoms[0]).should.have.property('x', -4.9179);
            (parsed.atoms[242]).should.have.property('x', 7.5208);

            (parsed.bonds.length).should.equal(parsed.countLine.bonds);
            (parsed.bonds[0]).should.have.property('from', 44);
            (parsed.bonds[0]).should.have.property('to', 47);
            (parsed.bonds[0]).should.have.property('bondType', 1);
            (parsed.bonds[256]).should.have.property('from', 242);
            (parsed.bonds[256]).should.have.property('to', 243);
            (parsed.bonds[256]).should.have.property('bondType', 2);

            (parsed.properties).should.have.property('CHG');
            (parsed.properties.CHG).should.have.property(3, -1);
            (parsed.properties.CHG).should.have.property(220, -1);
            (parsed.properties.CHG).should.have.property(243, -1);

            (parsed.data).should.be.an.Object;
            (parsed.data).should.have.property('ID', 'zwitterions_2');
        });
    });

    describe('prescanMol', function () {
        it('should prescan a complete mol file', function () {
            var file = String(fs.readFileSync('test/fixtures/single.sdf')),
                scan = parser.prescanMol(file);

            (scan.newlines).should.be.an.Array;
            (scan.newlines[0]).should.equal(0);
            (scan.firstM).should.equal(135);
            (scan.lastM).should.equal(135);
            (scan.firstAngle).should.equal(142);
            (scan.sectionEnd).should.equal(166);
        });
        it('should handle empty input', function () {
            var scan = parser.prescanMol('');

            (scan.newlines).should.be.an.Array;
            (scan.newlines).length.should.equal(0);
        });
        it('should handle malformed input', function () {
            var scan = parser.prescanMol(' ');

            (scan.newlines).should.be.an.Array;
            (scan.newlines).length.should.equal(0);
        });
    });

    describe('makeDate', function () {
        it('should handle dates in the 2000s', function () {
            var d = parser.makeDate('1102130613');

            dateMatch(d, new Date("2013-11-02T06:13:00")).should.be.ok;
        });
        it('should handle dates in the 1980s', function () {
            var d = parser.makeDate('1102850613');

            dateMatch(d, new Date("1985-11-02T06:13:00")).should.be.ok;
        });
    });

    describe('parse-many', function () {
        it('should be able to open a stream on the fixtures (single)', function (done) {
            function parseAndCheck(molfile) {
                var parsed = parser.parseMol(molfile);

                (parsed.data.ID).should.not.equal(null);
            }

            var callback = sinon.spy(parseAndCheck),
                splitter = new parser.SDFSplitter(callback);


            splitter.on('finish', function () {
                (callback.callCount).should.be.exactly(1);

                done();
            });

            fs.createReadStream('test/fixtures/single.sdf')
                .pipe(splitter);
        });

        it('should be able to open a stream on the fixtures (double)', function (done) {
            function parseAndCheck(molfile) {
                var parsed = parser.parseMol(molfile);

                (parsed.data.ID).should.not.equal(null);
            }

            var callback = sinon.spy(parseAndCheck),
                splitter = new parser.SDFSplitter(callback);

            splitter.on('finish', function () {
                (callback.callCount).should.be.exactly(2);

                done();
            });

            fs.createReadStream('test/fixtures/double.sdf')
                .pipe(splitter);
        });
    });

    // TODO(SOM): tests for missing header data, missing date etc.

    describe('discovered errors', function () {
        it('should produce an empty bonds[] array when bondcount is zero', function () {
            var mol = '\r\n  Mol2Comp06180618072D\r\n\r\n  1  0  0  0  0  0  0  0  0  0999 V2000\r\n   10.2967   -1.5283    0.0000 Ar  0  0  0  0  0  0  0  0  0  0  0  0\r\nM  END\r\n>  <ID>\r\n_Elements.#003\r\n\r\n\r\n$$$$\r\n',
                parsed = parser.parseMol(mol);

            parsed.bonds.should.eql([]);
        });

        it('should parse the two-molfile file', function (done) {
            function parseAndCheck(molfile) {
                var parsed = parser.parseMol(molfile);

                (parsed.data.ID).should.not.equal(null);
            }

            var callback = sinon.spy(parseAndCheck),
                transform = new parser.SDFTransform();

            transform.on('finish', function () {
                (callback.callCount).should.be.exactly(2);

                done();
            });
            transform.on('data', function (chunk) {
                callback(String(chunk));
            });

            fs.createReadStream('test/fixtures/double-dos.sdf')
                .pipe(transform);
        });

        it('should parse the zwitterions_1.002 file', function (done) {
            var transform = new parser.SDFTransform();

            transform.on('data', function (chunk) {
                var mol = parser.parseMol(String(chunk));

                console.log(JSON.stringify(mol));

                (mol.atoms.length).should.equal(4);
                (mol.properties.CHG).should.have.property(3, 1);
                (mol.properties.CHG).should.have.property(4, -1);
                done();
            });

            fs.createReadStream('test/fixtures/zwitterions_1.002.sdf')
                .pipe(transform);
        });

    });
});
