/*globals: it, describe*/
require('should');
var fs = require('fs'),
    sinon = require('sinon'),
    parser = require('../../lib/parser');


describe('parser', function() {
    describe('parse-many', function () {
        it('should be able to open a stream on the fixtures (full)', function (done) {

            function parseAndCheck(molfile) {
                var parsed = parser.parseMol(molfile);

                (parsed.data.ID).should.not.equal(null);
            }

            var callback = sinon.spy(parseAndCheck),
                splitter = new parser.SDFSplitter(callback);


            splitter.on('finish', function () {
                (callback.callCount).should.be.exactly(2186);

                done();
            });

            fs.createReadStream('test/fixtures/InChI_TestSet.sdf')
                .pipe(splitter);
        });
    });
});
