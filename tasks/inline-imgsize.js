module.exports = function(grunt) {

    var fs        = require('fs'),
        path      = require('path'),
        imagesize = require('imagesize');

    var regexes = {
        // only match local files
        img: /<img[^\>]+src=['"](?!http:|https:|\/\/|data:image)([^"']+)["'][^\>]*>/gm,
        src: /src=['"]([^"']+)["']/m,
        size: /(height|width)=/
    };

    var fileOptions = {
        encoding: 'utf-8'
    };

    var options = {
        encoding: 'utf8',
        quote: ''
    };

    grunt.registerMultiTask('inlineImgSize', 'Inject width and height for img tags', function() {

        grunt.util._.extend(options, this.options());

        var Parser = imagesize.Parser;
        var get_image_dimensions = function (buffer) {
            var parser = Parser();

            switch (parser.parse(buffer)) {
                case Parser.EOF:
                    return;
                case Parser.INVALID:
                    return;
                case Parser.DONE:
                    return parser.getResult();
            }
        };

        this.files.forEach(function(f) {
            var src = f.src.filter(function(path) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(path)) {
                    grunt.log.warn('Source file "' + path + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(path) {
                var contents = grunt.file.read(path, fileOptions);

                var matches = contents.match(regexes.img) || [];
                matches.forEach(function(tag) {
                    // XXX is this necessary?
                    // tag = tag.substring(0, tag.length - 1);

                    // skip this img if the size is already specified
                    if (tag.match(regexes.size)) {
                        return;
                    }

                    var src = tag.match(regexes.src)[1];
                    var imgpath = path.replace(/[^\/]+$/, '') + src;
                    var dimensions = get_image_dimensions(fs.readFileSync(imgpath));
                    if (!dimensions) {
                        return;
                    }

                    var replacement = tag.replace(/^<img/, "<img width="+ options.quote + dimensions.width + options.quote +" height="+ options.quote + dimensions.height + options.quote);

                    contents = contents.replace(tag, replacement);
                });

                grunt.file.write(path, contents, fileOptions);
            });
        });
    });

};
