import { AnimationController } from "../../../../cocos/animation/animation";
import { AnimationGraph } from "../../../../cocos/animation/marionette/animation-graph";
import { AnimationGraphEval } from "../../../../cocos/animation/marionette/graph-eval";
import { Node } from "../../../../cocos/scene-graph";

export class AnimationGraphEvalMock {
    constructor(
        node: Node,
        animationGraph: AnimationGraph,
    ) {
        const controller = node.addComponent(AnimationController) as AnimationController;
        this._controller = controller;

        const graphEval = new AnimationGraphEval(
            (animationGraph instanceof AnimationGraph) ? animationGraph : animationGraph.original!,
            node,
            controller,
            (animationGraph instanceof AnimationGraph) ? null : animationGraph.clipOverrides,
        );
        // @ts-expect-error HACK
        controller._graphEval = graphEval;
        this._eval = graphEval;
    }

    get controller() {
        return this._controller;
    }

    get current() {
        return this._current;
    }

    get lastDeltaTime() {
        return this._lastDeltaTime;
    }

    public step(deltaTime: number) {
        this._current += deltaTime;
        this._eval.update(deltaTime);
        this._lastDeltaTime = deltaTime;
    }

    public goto(time: number) {
        const deltaTime = time - this._current;
        this._current = time;
        this._eval.update(deltaTime);
        this._lastDeltaTime = deltaTime;
    }

    private _current = 0.0;

    private _lastDeltaTime = 0.0;

    private _eval: AnimationGraphEval;
    private _controller: AnimationController;
}
