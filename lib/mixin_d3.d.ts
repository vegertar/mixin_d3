import * as d3 from "d3";
import { CustomElement } from "./custom_element";
import { OverloadedParameters } from "./overloaded";

type D3Selection = d3.Selection<d3.BaseType, Datum, d3.BaseType, Datum>;
type D3Transition = d3.Transition<d3.BaseType, Datum, d3.BaseType, Datum>;
type D3Type = D3Selection | D3Transition;
type D3ValueFn = d3.ValueFn<d3.BaseType, Datum, d3.KeyType>;
type SelectAllParameters = OverloadedParameters<D3Selection["selectAll"]>;
type JoinParameters = OverloadedParameters<D3Selection["join"]>;
type EachParameters = OverloadedParameters<D3Selection["each"]>;
type CallParameters = OverloadedParameters<D3Selection["call"]>;
type TextParameters = OverloadedParameters<D3Selection["text"]>;
type AttrParameters<T extends D3Type> = OverloadedParameters<T["attr"]>;
type StyleParameters<T extends D3Type> = OverloadedParameters<T["style"]>;
type EventParameters<T extends D3Type> = OverloadedParameters<T["on"]>;
type PropertyParameters = OverloadedParameters<D3Selection["property"]>;
type TweenParameters = OverloadedParameters<D3Transition["tween"]>;
type CustomElementConstructor = new (...args: any[]) => CustomElement;

type Collection<
  T extends
    | AttrParameters<D3Type>
    | StyleParameters<D3Type>
    | EventParameters<D3Type>
    | PropertyParameters
    | TweenParameters
> =
  | T[]
  | {
      [key: string]: T[1];
    };

type Entries<T extends { [key: string]: any }> = {
  [K in keyof T]: [K, ...T[K]];
}[keyof T][];

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type D3TransitionFunctions = FunctionPropertyNames<D3Transition>;

type Transition =
  | ({
      [Property in D3TransitionFunctions]?: OverloadedParameters<
        D3Transition[Property]
      >[0];
    } & {
      attrs?: Collection<AttrParameters<D3Transition>>;
      styles?: Collection<StyleParameters<D3Transition>>;
      events?: Collection<EventParameters<D3Transition>>;
      tweens?: Collection<TweenParameters>;
    })
  | Entries<{
      [Property in D3TransitionFunctions]?: OverloadedParameters<
        D3Transition[Property]
      >;
    }>;

type Transitions =
  | Transition[]
  | [
      string | D3Transition,
      Transition,
      ...(string | D3Transition | Transition)[]
    ];

export interface Datum {
  [key: string]: any;

  /**
   *  `tag` is the node name passing to `d3.create` to create a new node.
   * Ordinarily, if `ns` in parent is not empty and `tag` doesn't contain the
   * optional `ns` prefix, both `tag` and parent `ns` fields are getting
   * involved to create the new node. If `tag` is empty then `.text` field is
   * used to create a literal node. _`tag` will not be inherited._
   *
   * E.g.
   * ```js
   * // create <g> without namespace
   *   {tag: "g"} => d3.create("g").node()
   * // create <g> without namespace as this 'ns' affects descendants only
   *   {tag: "g", ns: "svg"} => d3.create("g").node()
   * // create <g> within svg namespace
   *   {ns: "svg", data: [{tag: "g"}]} => d3.create("svg:g").node()
   * // create <a> within xhtml namespace
   *   {tag: "xhtml:a"} => d3.create("xhtml:a").node()
   * // create <a> within xhtml namespace along with specifying descendant `ns`
   *   {tag: "xhtml:a", ns: "svg"} => d3.create("xhtml:a")
   * // create a TextNode
   *   { text: "hello" }
   * // create a <text> in SVG namespace
   *   { ns: "svg", data: [{text: "hi}] }
   * ```
   */
  tag?: string;

  /**
   * `ns` specifies the namespace to help create the children nodes.
   * _`ns` will be inherited by children if one not provided._
   */
  ns?: "svg" | "xhtml" | "xlink" | "xml" | "xmlns" | null;

  /**
   * `selector` is the parameter passing to `d3.Selection.selectAll` to create
   * a selection of children.
   * _`selector` will be inherited by children if one not provided._
   */
  selector?: SelectAllParameters[0];

  /**
   * `data` is the first parameter passing to `d3.Selection.data` to bind
   * datum. To remove all children one should assign `data` an empty array,
   * or just set `data.length` to zero, `undefined` or `null` one will not
   * be touched.
   *
   * Pay attention that `data` behaves completely different from
   * `d3.Selection.data` when type is `Datum[]` along with an empty `key`. In
   * this case, whenever a `data` item is assigned a new `Datum` object, the
   * corresponding element will be recreated, though the index is not changed,
   * which causes d3 calling `onupdate` other than `onenter` at `join` phase.
   *
   * On the other hand, if `data` is a literal array, or more accurately,
   * the first element is literal, then mixin_d3 is working totally as d3 does,
   * but a literal node will be created since no `tag` provided, for "svg" `ns`,
   * it's &lt;text&gt;, otherwise calls `document.createTextNode`.
   *
   * _`data` will not be inherited._
   *
   * E.g.
   * ```js
   * // init:
   *    this.data = [{tag: "div" }]
   * //   the children of <div> is empty
   *
   * // the first set:
   *    this.data[0].data = [{tag: "p"}]
   * //   the length of children has changed, causes d3.Selection.enter()
   * //   mixin_d3 attaches <p> with the initial datum {tag: "p"}
   *
   * // reset one child:
   *    this.data[0].data[0] = {tag: "span"}
   * //   the length of children remains, causes d3.Selection.update()
   * //   mixin_d3 detects that the datum is changed
   * //   destroys <p> and creates <span>
   * //   attaches <span> with the initial datum {tag: "span"}
   */
  data?: [string | number | boolean | undefined, ...any[]] | Datum[] | null;

  /**
   * `key` is the second parameter passing to `d3.Selection.data`.
   * _`key` will be inherited by children if one not provided._
   */
  key?: D3ValueFn | null;

  /**
   * `join` is a parameter list passing to `d3.Selection.join`.
   * _`join` will be inherited by children if one not provided._
   */
  join?: JoinParameters | null;

  /**
   * `each` is a function passing to `d3.Selection.each`.
   * _`each` will be inherited by children if one not provided._
   */
  each?: EachParameters[0] | null;

  /**
   * `call` is a parameter list passing to `d3.Selection.call`. For the call of
   * simplicity, one can assign the function itself if no parameters.
   * _`call` will be inherited by children if one not provided._
   */
  call?: CallParameters | CallParameters[0] | null;

  /**
   * `$enter` is the `onenter` hook to create a new node. Unlike `join`
   * works on children nodes, `$enter` is applied on the datum's own.
   * _`$enter` will not be inherited._
   */
  $enter?: (selection: D3Selection) => void;

  /**
   * `$update` is the `onupdate` hook to update an old node. Unlike `join`
   * works on children nodes, `$update` is applied on the datum's own.
   * _`$update` will not be inherited._
   */
  $update?: (selection: D3Selection) => void;

  /**
   * `$each` is applied on datum's own node unlike `each` which works on
   * children nodes. _`$each` will not be inherited._
   */
  $each?: EachParameters[0] | null;

  /**
   * `$call` is applied on datum's own node unlike `call` which works on
   * children nodes. _`$call` will not be inherited._
   */
  $call?: CallParameters | CallParameters[0] | null;

  /**
   * `text` is the parameter passing to `d3.Selection.text`. _`text` will
   * not be inherited._
   */
  text?: TextParameters[0] | null;

  /**
   * `attrs` is a collection of attributes passing to `d3.Selection.attr`
   * in batch. _`attrs` will not be inherited._
   *
   * E.g.
   * ```js
   * // Set attrs with an object.
   * this.data[0].attrs = {
   *   "x": 0,
   *   "y": 1,
   * };
   *
   * // Or set attrs in an array like way.
   * this.data[0].attrs = [
   *   ["x", 0],
   *   ["y", 1],
   * ];
   * ```
   */
  attrs?: Collection<AttrParameters<D3Selection>>;

  /**
   * `properties` is a collection of properties passing to
   * `d3.Selection.property` in batch. _`properties` will not be inherited._
   *
   * E.g.
   * ```js
   * // Set properties with an object.
   * this.data[0].properties = {
   *   "value": 10,
   * };
   *
   * // Or set properties in an array like way.
   * this.data[0].properties = [
   *   ["value", 0],
   * ];
   * ```
   */
  properties?: Collection<PropertyParameters>;

  /**
   * `styles` is a collection of styles passing to `d3.Selection.style`
   * in batch. _`styles` will not be inherited._
   *
   * E.g.
   * ```js
   * // Set styles with an object.
   * this.data[0].styles = {
   *   "width": 10,
   *   "height": 10,
   *   "background-color": "red",
   * };
   *
   * // Or set styles in an array like way.
   * this.data[0].styles = [
   *   ["width", 10],
   *   ["height", 10],
   * // Unlike object item pair, we can set additional parameters.
   *   ["background-color", "red", "important"],
   * ];
   * ```
   */
  styles?: Collection<StyleParameters<D3Selection>>;

  /**
   * `events` is a collection of events passing to `d3.Selection.on`
   * in batch. _`events` will not be inherited._
   *
   * E.g.
   * ```js
   * // Set events with an object.
   * this.data[0].events = {
   *   click() {}
   * };
   *
   * // Or set events in an array like way.
   * this.data[0].events = [
   * // Unlike object item pair, we can set additional parameters.*
   *   ["click", () => {}, true]
   * ];
   * ```
   */
  events?: Collection<EventParameters<D3Selection>>;

  /**
   * `transitions` is a collection of transitions passing to
   * `d3.Selection.transition` in batch. _`transitions` will not be inherited._
   *
   * E.g.
   * ```js
   * // Set every transition from an object.
   * this.data[0].transitions = [
   *   {
   *     duration: 100,
   *     attrs: { width: 100 },
   *     events: {
   *       start() {},
   *     },
   *   },
   *   {
   *     duration: 100,
   *     attrs: { height: 100 }
   *     events: {
   *       end() {},
   *     },
   *   },
   * ];
  
  * // Or use the predefined transition name/instance
   * this.data[0].transitions = [
   * // the transition name is placed before transition configures
   *   this.root.transition().duration(750).ease(d3.easeLinear),
   *   {
   *     attrs: { width: 100 },
   *     events: {
   *       start() {},
   *     },
   *   },
   *   {
   *     duration: 100,
   *     attrs: { height: 100 }
   *     events: {
   *       end() {},
   *     },
   *   },
   * ];
   *
   * // Or set transitions in an array like way.
   * this.data[0].events = [
   * // the optional transition name can be placed in here
   *   this.root.transition(),
   *   [
   *     ["duration", 100],
   *     ["attr", "width", 100],
   *     ["on", "start", () => {}],
   *   ]
   * ];
   * ```
   */
  transitions?: Transitions;
}

type TransitionProxy = {
  [Property in D3TransitionFunctions]?: (
    ...v: OverloadedParameters<D3Transition[Property]>
  ) => TransitionProxy;
};

/**
 * `DatumProxy` provides some convenient functions to adapt d3 API. It's worth
 * noting if we know what we do, it's OK that we have a couple of incompatible
 * getter/setter(s). Although the `text/join/each/call` below are having a
 * getter property, which is actually a getter for an underlying setter, such
 * that we can, e.g., set `text` in two ways, `.text("hi")` or `.text = "hi".`
 * Further more, one should never try getting original value from `DatumProxy`
 * interface, all methods declared in here are proxies of setters, indeed,
 * `.text()` will be executed as `.text = undefined`.
 */
interface DatumProxy extends Omit<Datum, "text" | "join" | "each" | "call"> {
  /**
   * `touch` manually update children, if, say, one changed the `key`.
   */
  touch(): void;
  /**
   * `$` helps calling method of this node by `name`. For example, if one wanna
   * set an attribute for this node, one way is using this function, call
   * `.$("setAttribute", "foo", "bar")`. Although the node has not been created,
   * by given the `name` and `args`, one can apply arbitrary methods in advance.
   * As same as others, `$` should be considered a setter.
   */
  $(name: string, ...args: any[]): DatumProxy;

  // @ts-ignore: error TS2380
  get text(): (...v: TextParameters) => DatumProxy;
  set text(v: Datum["text"]);

  // @ts-ignore: error TS2380
  get join(): (...v: JoinParameters) => DatumProxy;
  set join(v: Datum["join"]);

  // @ts-ignore: error TS2380
  get each(): (...v: EachParameters) => DatumProxy;
  set each(v: Datum["each"]);

  // @ts-ignore: error TS2380
  get call(): (...v: CallParameters) => DatumProxy;
  set call(v: Datum["call"]);

  property(...v: PropertyParameters): DatumProxy;
  attr(...v: AttrParameters<D3Selection>): DatumProxy;
  style(...v: StyleParameters<D3Selection>): DatumProxy;
  on(...v: EventParameters<D3Selection>): DatumProxy;
  transition(t?: string | D3Transition): TransitionProxy;
}

export interface DataProxy extends Array<DatumProxy> {
  /**
   * See {@link DatumProxy.touch}.
   */
  touch(): void;
}

/**
 * `excludeChildNodes` creates a selector function to filter out all excluded
 * names in `this.childNodes`.
 */
export function excludeChildNodes(...excludes: string[]): Datum["selector"];

/**
 * `includeChildNodes` creates a selector function to filter the included names
 * in `this.childNodes`.
 */
export function includeChildNodes(...includes: string[]): Datum["selector"];

/**
 * `create` creates a d3 selection. Unlike `d3.Selection.__data__` which is
 * totally controlled by joining key or index, the input `Datum` will be
 * attached to an internal symbol property of the newly created node to detect
 * datum resettings in later.
 */
export function create(d: Datum, ns?: Datum["ns"]): D3Selection;

/**
 * `Mixin` declares properties/methods that mixin_d3 salting into a subclass of
 * [[CustomElement]].
 */
interface Mixin {
  /**
   * `sync` indicates that if `dispatch` runs `update` in sync mode. Defaults
   * `false`.
   */
  sync: boolean;
  /**
   * `root` is the root selection that mixin_d3 working at. Default `root`
   * refers to custom element itself or `shadowRoot` if has attached to the
   * `ShadowDOM`.
   */
  root: D3Selection;
  /**
   * `selector` defines the way to select all descendants to work with. By
   * default all child nodes except `link/style/script/foreignObject/slot` are
   * used.
   */
  selector: Datum["selector"];
  /**
   * Defaults `null`. See {@link Datum.ns}.
   */
  ns: Datum["ns"];
  /**
   * Defaults `null`. See {@link Datum.key}.
   */
  key: Datum["key"];
  /**
   * Defaults `null`. See {@link Datum.join}.
   */
  join: Datum["join"];
  /**
   * Default `null`. See {@link Datum.each}.
   */
  each: Datum["each"];
  /**
   * Defaults `null`. See {@link Datum.call}.
   */
  call: Datum["call"];

  /**
   * `dispatch` will be called whenever there is a change in `.data`. This is a
   * wrapper function just call either `.update` or `.updateAsync` by property
   * `.sync`.
   */
  dispatch(): void;

  /**
   * `update` calls `this.root.selectAll(this.root)` to apply changelogs.
   */
  update(): void;

  /**
   * `updateAsync` requests `.update` in `this.raf` to run updating before next
   * paint.
   */
  updateAsync(): void;

  /**
   * The majority way to update UI is by using `.data`, though this is a getter
   * which actually is a proxy of underlying setters, further see [[DatumProxy]].
   * Pay attention that this getter is only defined after the node mounted.
   */
  // @ts-ignore: error TS2380
  get data(): DataProxy;
  /**
   * The `data` setter is used for resetting all children, against getter which
   * usually affects part of them. Pay attention that this setter is only defined
   * after the node mounted. If `this.data` has already been defined, which is
   * the default behavior along with default value of `[]`, the old `this.data`
   * will be used to initialize [[DataProxy]].
   */
  set data(children: Datum["data"]);
}

/**
 * The is a simple type alias to create [[Mixin]].
 */
type MixinClass = { new (...args: any[]): Mixin };

/**
 * `mixinD3` mixin D3 with a subclass of [[CustomElement]] to approach a way of
 * JSON-style coding.
 */
export function mixinD3<T extends CustomElementConstructor>(
  Base: T,
  D3?: typeof d3
): MixinClass & T;

/**
 * `MixinD3` is a short way of `mixinD3(CustomElement)`.
 */
export declare const MixinD3: ReturnType<typeof mixinD3>;
