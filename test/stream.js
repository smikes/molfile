require('should');
var parser = require('../lib/parser'),
    sinon = require('sinon'),
    fs = require('fs'),
    resumer = require('resumer');

function spySplitter(expectedCount, done) {
    var callback = sinon.spy(),
        splitter = new parser.SDFSplitter(callback);

    splitter.on('finish', function () {
        (callback.callCount).should.be.exactly(expectedCount);

        done();
    });

    return splitter;
}

describe('streaming', function () {
    describe('splitter', function () {
        it('should be able to open a stream on the fixtures (single)', function (done) {
            var splitter = spySplitter(1, done);

            fs.createReadStream('test/fixtures/single.sdf')
                .pipe(splitter);
        });
        it('should be able to open a stream on the fixtures (double)', function (done) {
            var splitter = spySplitter(2, done);

            fs.createReadStream('test/fixtures/double.sdf')
                .pipe(splitter);
        });
        it('should be able to open a stream on the fixtures (many)', function (done) {
            var splitter = spySplitter(55, done);

            fs.createReadStream('test/fixtures/first-55.sdf')
                .pipe(splitter);
        });
        it('should pass the molfile contents to the callback', function (done) {
            var callback = sinon.spy(),
                splitter = new parser.SDFSplitter(callback);

            splitter.on('finish', function () {
                callback.calledWithExactly('foo\n');
                callback.calledWithExactly('bar\n');
                callback.calledWithExactly('bletch\n');
                done();
            });

            resumer().queue('foo\n$$$$\nbar\n$$$$\nbletch\n$$$$').end()
                .pipe(splitter);
        });
    });
});
