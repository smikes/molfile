require('should');
var parser = require('../../lib/parser'),
    fs = require('fs');

describe('streaming-slow', function () {
    describe('basic', function () {
        it('should be able to open a stream on the fixtures (full)', function (done) {
            var count = 0,
                callback = function () {
                    count += 1;
                },
                splitter = new parser.SDFSplitter(callback);

            splitter.on('finish', function () {
                (count).should.be.exactly(2186);

                done();
            });

            fs.createReadStream('test/fixtures/InChI_TestSet.sdf')
                .pipe(splitter);
        });

    });
});
