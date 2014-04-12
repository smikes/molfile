require('should');
var parser = require('../../lib/parser'),
    sinon = require('sinon'),
    fs = require('fs');

describe('streaming-slow', function () {
    describe('basic', function () {
        it('should be able to open a stream on the fixtures (full)', function (done) {
            var callback = sinon.spy(),
                splitter = new parser.SDFSplitter(callback);

            splitter.on('finish', function () {
                (callback.callCount).should.be.exactly(2187);

                done();
            });

            fs.createReadStream('test/fixtures/InChI_TestSet.sdf')
                .pipe(splitter);
        });

    });
});
