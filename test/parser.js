require('should');
var parser = require('../lib/parser');

describe('parser', function() {
    describe('getVersion', function () {
        it('should be a function', function () {
            (parser.getVersion).should.be.a.Function;
        });
        it('should have a version matching package.json', function (done) {
            var fs = require('fs');

            function afterRead(err, data) {
                var p = JSON.parse(data);
                var version = parser.getVersion();

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
            (parsed.date).should.eql(new Date(2006,06,18,18,07));
        });
    });
});
