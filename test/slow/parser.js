/*globals: it, describe*/
require('should');
var fs = require('fs'),
    parser = require('../../lib/parser');


describe('parser', function() {
    describe('parse-many', function () {
        it('should be able to open a stream on the fixtures (full)', function (done) {

            var callback = parseAndCheck,
                splitter = new parser.SDFSplitter(callback),
                count = 0;

            function parseAndCheck(molfile) {
                var parsed = parser.parseMol(molfile);

                count += 1;

                (parsed.data.ID).should.not.equal(null);
            }


            splitter.on('finish', function () {
                (count).should.be.exactly(2186);

                done();
            });

            fs.createReadStream('test/fixtures/InChI_TestSet.sdf')
                .pipe(splitter);
        });
    });
});
