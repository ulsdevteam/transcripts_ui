(function ($) {

    ScrollingTranscript = (function () {
        var ui = [];

        function createUI($transcript) {

            var transid = $transcript.attr('data-transcripts-id');

            var obj = {
                trid: transid,
                player: null,
                one: null,
                sweetSpot: 0,
                resetSweet: true,
                playSentence: 0,
                playIndex: 0,
                startPointer: 0,
                lastNow: 0,

                starts: $('*[data-begin]', $transcript).not('.deleted').map(function (element, index) {
                    var o = {};
                    o.$item = $(this);
                    o.begin = $(this).attr('data-begin');
                    o.end = $(this).attr('data-end');
                    return o;
                }).toArray().sort(function (a, b) {
                    return a.begin - b.begin;
                }),

                ends: $('*[data-end]', $transcript).not('.deleted').map(function (element, index) {
                    var o = {};
                    o.$item = $(this);
                    o.begin = $(this).attr('data-begin');
                    o.end = $(this).attr('data-end');
                    return o;
                }).toArray().sort(function (a, b) {
                    return a.end - b.end;
                }),

                setVideo: function(element) {
                    var that = this;
                    player = element;

                    var playPause = function(e) {
                        if (!player.paused) { //if playing
                            that.checkNow(player.currentTime);
                        }
                    };

                    var timeUpdated = function(e) {
                        var now = player.currentTime;

                        //if playmode=playstop, then don't keep scrolling when you stop
                        if (!player.paused && that.one != null && now > that.one.attr('data-end')) {
                            player.pause();
                            now = player.currentTime;
                            that.lastNow = now;
                        }

                        //clean highlights and scroll
                        if (!player.paused || Math.abs(that.lastNow - now) > .2) {
                            that.checkScroll(now);
                        }
                    };

                    player.setAttribute('data-transcripts-id', that.trid);
                    player.addEventListener('play', playPause, false);
                    player.addEventListener('pause', playPause, false);
                    player.addEventListener('timeupdate', timeUpdated, false);
                    player.addEventListener('loadedmetadata', function () {
                        var jump = $.param.fragment();
                        if (jump != '') {
                            that.playOne($('#' + jump.replace('tcu/', '')));
                        }
                    });
                },

                playFrom: function(seconds) {
                    if (player != null) {
                        player.currentTime = seconds;
                        if (player.paused) player.play();
                    }
                },

                playOne: function ($item) {
                    var reset = typeof this.resetSweet !== 'undefined' ? this.resetSweet : true;
                    if ($item.attr('data-end') - $item.attr('data-begin') > 0) {
                        this.one = $item;
                        this.endAll();
                        if (reset) {
                            this.sweetSpot = $item.position().top;
                        }
                        this.playIndex = parseInt($item.attr('data-starts-index'));
                        this.playFrom($item.attr('data-begin'));
                    }
                },

                checkNow: function(now) {
                    if (this.one != null && (now < parseFloat(this.one.attr('data-begin')) - .1 || now > parseFloat(this.one.attr('data-end')) + .1)) {
                            this.one = null;
                    }
                },

                checkScroll: function(now) {
                    //if (this.lastNow != now) {
                    var that = this;
                    $('.playing', $transcript).each(function () {
                        if (now < $(this).attr('data-begin') || now > $(this).attr('data-end')) {
                            that.endPlay($(this));
                        }
                    });
                    if (now < this.lastNow) {
                        this.startPointer = 0; //go back to start
                        this.playIndex = 0;
                    }
                    while (now > this.starts[this.startPointer]['begin']) {
                        if (now < this.starts[this.startPointer]['end']) {
                            this.playIndex = this.startPointer;
                            this.startPlay(this.starts[this.startPointer].$item);
                        }
                        this.startPointer++;
                    }
                    this.lastNow = now;
                    //}
                },

                startPlay: function ($id) {
                    $id.addClass('playing'); //sentence
                    $('[data-transcripts-role=hit-panel][data-transcripts-id=' + this.trid + ']').find('*[data-refid=' + $id.attr('id') + ']').addClass('playing'); //hit result
                    var $scroller = $transcript;
                    if ($scroller.size() == 1) {
                        var idTop = $id.position().top;

                        //sentence out of view above
                        if (idTop < 0 && this.sweetSpot < 0) {
                            this.sweetSpot = 0;
                            $scroller.scrollTo($id);
                        }

                        //sentence above scroll sweet spot
                        else if (idTop < 0 || idTop < this.sweetSpot) {
                            $scroller.scrollTo('-=' + (this.sweetSpot - idTop), {axis: 'y'});
                        }
                        //sentence below scroll sweet spot
                        else {
                            $scroller.scrollTo('+=' + (idTop - this.sweetSpot), {axis: 'y'});

                            //sentence out of view below
                            if ($id.position().top > $scroller.height() - $id.height()) {
                                $scroller.scrollTo($id);
                            }
                        }
                    }
                },

                endPlay: function ($id) {
                    $id.removeClass('playing'); //sentence
                    $('[data-transcripts-role=hit-panel][data-transcripts-id=' + this.trid + ']').find('*[data-refid=' + $id.attr('id') + ']').removeClass('playing'); //hit result

                    //change sweet spot if user scrolls transcript while playing
                    this.sweetSpot = $id.position().top;
                },

                endAll: function () {
                    var that = this;
                    $('.playing', $transcript).each(function () {
                        that.endPlay($(this));
                    });
                },

                previous: function () {
                    var n = this.playIndex > 0 ? this.playIndex - 1 : 0;
                    this.resetSweet = false; //will be set back to true after line is played
                    window.location.hash = 'tcu/' + $(this.starts[n].$item).attr('id');
                },

                sameAgain: function () {
                    /* can't set window.location.hash because it won't change */
                    this.playOne($(this.starts[this.playIndex].$item));
                },

                next: function () {
                    var n = this.playIndex == this.starts.length - 1 ? this.playIndex : this.playIndex + 1;
                    this.resetSweet = false; //will be set back to true after line is played
                    window.location.hash = 'tcu/' + $(this.starts[n].$item).attr('id');
                }

            };

            for (var i = 0; i < obj.starts.length; i++) {
                obj.starts[i].$item.attr('data-starts-index', i);
            }

            window.addEventListener("hashchange", function () {
                obj.playOne($(window.location.hash.replace('tcu/', '')));
                obj.resetSweet = true;
            }, false);

            return obj;

        }

        return {
            getUI: function ($transcript) {
                var trid = $transcript.attr('data-transcripts-id');

                if (!ui[trid]) {
                    ui[trid] = createUI($transcript);
                }
                return ui[trid];
            }
        };
    })();

})(jQuery);