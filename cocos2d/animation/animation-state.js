
var JS = cc.js;
var Playable = require('./playable');

var Types = require('./types');
var WrappedInfo = Types.WrappedInfo;
var WrapMode = Types.WrapMode;
var WrapModeMask = Types.WrapModeMask;

/**
 * !#en
 * The AnimationState gives full control over animation playback process.
 * In most cases the Animation Component is sufficient and easier to use. Use the AnimationState if you need full control.
 * !#zh
 * AnimationState 完全控制动画播放过程。<br/>
 * 大多数情况下 动画组件 是足够和易于使用的。如果您需要更多的动画控制接口，请使用 AnimationState。
 * @class AnimationState
 * @extends Playable
 *
 */

/**
 * @method constructor
 * @param {AnimationClip} clip
 * @param {String} [name]
 */
function AnimationState (clip, name) {
    Playable.call(this);
    cc.EventTarget.call(this);
    
    this._firstFramePlayed = false;
    
    this._delay = 0;
    this._delayTime = 0;

    this._wrappedInfo = new WrappedInfo();
    this._lastWrappedInfo = null;

    this._process = process;

    this._clip = clip;
    this._name = name || (clip && clip.name);

    /**
     * @property animator
     * @type {AnimationAnimator}
     */
    this.animator = null;

    /**
     * !#en The curves list.
     * !#zh 曲线列表。
     * @property curves
     * @type {Object[]}
     */
    this.curves = [];

    // http://www.w3.org/TR/web-animations/#idl-def-AnimationTiming

    /**
     * !#en The start delay which represents the number of seconds from an animation's start time to the start of
     * the active interval.
     * !#zh 延迟多少秒播放。
     *
     * @property delay
     * @type {Number}
     * @default 0
     */
    this.delay = 0;

    /**
     * !#en The animation's iteration count property.
     *
     * A real number greater than or equal to zero (including positive infinity) representing the number of times
     * to repeat the animation node.
     *
     * Values less than zero and NaN values are treated as the value 1.0 for the purpose of timing model
     * calculations.
     *
     * !#zh 迭代次数，指动画播放多少次后结束, normalize time。 如 2.5（2次半）
     *
     * @property repeatCount
     * @type {Number}
     * @default 1
     */
    this.repeatCount = 1;

    /**
     * !#en The iteration duration of this animation in seconds. (length)
     * !#zh 单次动画的持续时间，秒。
     *
     * @property duration
     * @type {Number}
     * @readOnly
     */
    this.duration = 1;

    /**
     * !#en The animation's playback speed. 1 is normal playback speed.
     * !#zh 播放速率。
     * @property speed
     * @type {Number}
     * @default: 1.0
     */
    this.speed = 1;

    /**
     * !#en
     * Wrapping mode of the playing animation.
     * Notice : dynamic change wrapMode will reset time and repeatCount property
     * !#zh
     * 动画循环方式。
     * 需要注意的是，动态修改 wrapMode 时，会重置 time 以及 repeatCount
     *
     * @property wrapMode
     * @type {WrapMode}
     * @default: WrapMode.Normal
     */
    this.wrapMode = WrapMode.Normal;

    /**
     * !#en The current time of this animation in seconds.
     * !#zh 动画当前的时间，秒。
     * @property time
     * @type {Number}
     * @default 0
     */
    this.time = 0;


    this._emit = this.emit;
    this.emit = function () {
        var args = new Array(arguments.length);
        for (var i = 0, l = args.length; i < l; i++) {
            args[i] = arguments[i];
        }
        cc.director.getAnimationManager().pushDelayEvent(this, '_emit', args);
    };
}
JS.extend(AnimationState, Playable);

var proto = AnimationState.prototype;

cc.js.mixin(proto, cc.EventTarget.prototype);

proto._setListeners = function (target) {
    this._capturingListeners = target ? target._capturingListeners : null;
    this._bubblingListeners = target ? target._bubblingListeners : null;
    this._hasListenerCache = target ? target._hasListenerCache : null;
};

proto.onPlay = function () {
    // replay
    this.setTime(0);
    this._delayTime = this._delay;
    
    cc.director.getAnimationManager().addAnimation(this);

    if (this.animator) {
        this.animator.addAnimation(this);
    }
    
    this.emit('play', this);
};

proto.onStop = function () {
    if (!this.isPaused) {
        cc.director.getAnimationManager().removeAnimation(this);
    }

    if (this.animator) {
        this.animator.removeAnimation(this);
    }

    this.emit('stop', this);
};

proto.onResume = function () {
    cc.director.getAnimationManager().addAnimation(this);
    this.emit('resume', this);
};

proto.onPause = function () {
    cc.director.getAnimationManager().removeAnimation(this);
    this.emit('pause', this);
};

proto.setTime = function (time) {
    this.time = time || 0;

    var curves = this.curves;
    for (var i = 0, l = curves.length; i < l; i++) {
        var curve = curves[i];
        if (curve.onTimeChangedManually) {
            curve.onTimeChangedManually(time, this);
        }
    }
};

function process () {
    // sample
    var info = this.sample();

    var cache = this._hasListenerCache;
    if (cache && cache['lastframe']) {
        var lastInfo;
        if (!this._lastWrappedInfo) {
            lastInfo = this._lastWrappedInfo = new WrappedInfo(info);
        } else {
            lastInfo = this._lastWrappedInfo;
        }

        if (this.repeatCount > 1 && ((info.iterations | 0) > (lastInfo.iterations | 0))) {
            this.emit('lastframe', this);
        }

        lastInfo.set(info);
    }

    if (info.stopped) {
        this.stop();
        this.emit('finished', this);
    }
}

function simpleProcess () {
    var time = this.time;
    var duration = this.duration;

    if (time > duration) {
        time = time % duration;
        if (time === 0) time = duration;
    }
    else if (time < 0) {
        time = time % duration;
        if (time !== 0) time += duration;
    }

    var ratio = time / duration;

    var curves = this.curves;
    for (var i = 0, len = curves.length; i < len; i++) {
        var curve = curves[i];
        curve.sample(time, ratio, this);
    }

    var cache = this._hasListenerCache;
    if (cache && cache['lastframe']) {
        if (this._lastIterations === undefined) {
            this._lastIterations = ratio;
        }

        if ((this.time > 0 && this._lastIterations > ratio) || (this.time < 0 && this._lastIterations < ratio)) {
            this.emit('lastframe', this);
        }

        this._lastIterations = ratio;
    }
}

proto.update = function (delta) {
    // calculate delay time

    if (this._delayTime > 0) {
        this._delayTime -= delta;
        if (this._delayTime > 0) {
            // still waiting
            return;
        }
    }

    // make first frame perfect

    //var playPerfectFirstFrame = (this.time === 0);
    if (this._firstFramePlayed) {
        this.time += (delta * this.speed);
    }
    else {
        this._firstFramePlayed = true;
    }

    this._process();
};

proto._needRevers = function (currentIterations) {
    var wrapMode = this.wrapMode;
    var needRevers = false;

    if ((wrapMode & WrapModeMask.PingPong) === WrapModeMask.PingPong) {
        var isEnd = currentIterations - (currentIterations | 0) === 0;
        if (isEnd && (currentIterations > 0)) {
            currentIterations -= 1;
        }

        var isOddIteration = currentIterations & 1;
        if (isOddIteration) {
            needRevers = !needRevers;
        }
    }
    if ((wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse) {
        needRevers = !needRevers;
    }
    return needRevers;
};

proto.getWrappedInfo = function (time, info) {
    info = info || new WrappedInfo();
    
    var stopped = false;
    var duration = this.duration;
    var repeatCount = this.repeatCount;

    var currentIterations = time > 0 ? (time / duration) : -(time / duration);
    if (currentIterations >= repeatCount) {
        currentIterations = repeatCount;

        stopped = true;
        var tempRatio = repeatCount - (repeatCount | 0);
        if (tempRatio === 0) {
            tempRatio = 1;  // 如果播放过，动画不复位
        }
        time = tempRatio * duration * (time > 0 ? 1 : -1);
    }

    if (time > duration) {
        var tempTime = time % duration;
        time = tempTime === 0 ? duration : tempTime;
    }
    else if (time < 0) {
        time = time % duration;
        if (time !== 0 ) time += duration;
    }

    var needRevers = false;
    var shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
    if (shouldWrap) {
        needRevers = this._needRevers(currentIterations);
    }

    var direction = needRevers ? -1 : 1;
    if (this.speed < 0) {
        direction *= -1;
    }

    // calculate wrapped time
    if (shouldWrap && needRevers) {
        time = duration - time;
    }

    info.ratio = time / duration;
    info.time = time;
    info.direction = direction;
    info.stopped = stopped;
    info.iterations = currentIterations;

    return info;
};

proto.sample = function () {
    var info = this.getWrappedInfo(this.time, this._wrappedInfo);
    var curves = this.curves;
    for (var i = 0, len = curves.length; i < len; i++) {
        var curve = curves[i];
        curve.sample(info.time, info.ratio, this);
    }

    return info;
};


/**
 * !#en The clip that is being played by this animation state.
 * !#zh 此动画状态正在播放的剪辑。
 * @property clip
 * @type {AnimationClip}
 * @final
 */
JS.get(proto, 'clip', function () {
    return this._clip;
});

/**
 * !#en The name of the playing animation.
 * !#zh 动画的名字
 * @property name
 * @type {String}
 * @readOnly
 */
JS.get(proto, 'name', function () {
    return this._name;
});

JS.obsolete(proto, 'AnimationState.length', 'duration');

JS.getset(proto, 'curveLoaded',
    function () {
        return this.curves.length > 0;
    },
    function () {
        this.curves.length = 0;
    }
);


JS.getset(proto, 'wrapMode',
    function () {
        return this._wrapMode;
    },
    function (value) {
        this._wrapMode = value;

        if (CC_EDITOR) return;

        // dynamic change wrapMode will need reset time to 0
        this.time = 0;

        if (value & WrapModeMask.Loop) {
            this.repeatCount = Infinity;
        }
        else {
            this.repeatCount = 1;
        }
        
    }
);

JS.getset(proto, 'repeatCount',
    function () {
        return this._repeatCount;
    },
    function (value) {
        this._repeatCount = value;
        
        var shouldWrap = this._wrapMode & WrapModeMask.ShouldWrap;
        var reverse = (this.wrapMode & WrapModeMask.Reverse) === WrapModeMask.Reverse;
        if (value === Infinity && !shouldWrap && !reverse) {
            this._process = simpleProcess;
        }
        else {
            this._process = process;
        }
    }
);

JS.getset(proto, 'delay', 
    function () {
        return this._delay;
    },
    function (value) {
        this._delayTime = this._delay = value;
    }
);


cc.AnimationState = module.exports = AnimationState;
