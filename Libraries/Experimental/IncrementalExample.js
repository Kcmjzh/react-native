/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule IncrementalExample
 * @flow
 */
'use strict';

const React = require('react');
const ReactNative = require('react-native');
const {
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} = ReactNative;

const Incremental = require('Incremental');
const IncrementalGroup = require('IncrementalGroup');
const IncrementalPresenter = require('IncrementalPresenter');

const JSEventLoopWatchdog = require('JSEventLoopWatchdog');

/* $FlowFixMe(>=0.54.0 site=react_native_oss) This comment suppresses an error
 * found when Flow v0.54 was deployed. To see the error delete this comment and
 * run Flow. */
const performanceNow = require('fbjs/lib/performanceNow');

InteractionManager.setDeadline(1000);
JSEventLoopWatchdog.install({thresholdMS: 200});

let totalWidgets = 0;

class SlowWidget extends React.Component<$FlowFixMeProps, {ctorTimestamp: number, timeToMount: number}> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      ctorTimestamp: performanceNow(),
      timeToMount: 0,
    };
  }
  render() {
    this.state.timeToMount === 0 && burnCPU(20);
    return (
      <View style={styles.widgetContainer}>
        <Text style={styles.widgetText}>
          {`${this.state.timeToMount || '?'} ms`}
        </Text>
      </View>
    );
  }
  componentDidMount() {
    const timeToMount = performanceNow() - this.state.ctorTimestamp;
    this.setState({timeToMount});
    totalWidgets++;
  }
}

let imHandle;
function startInteraction() {
  imHandle = InteractionManager.createInteractionHandle();
}
function stopInteraction() {
  InteractionManager.clearInteractionHandle(imHandle);
}

function Block(props: Object) {
  const IncrementalContainer = props.stream ? IncrementalGroup : IncrementalPresenter;
  return (
    <IncrementalContainer name={'b_' + props.idx}>
      <TouchableOpacity
        onPressIn={startInteraction}
        onPressOut={stopInteraction}>
        <View style={styles.block}>
          <Text>
            {props.idx + ': ' + (props.stream ? 'Streaming' : 'Presented')}
          </Text>
          {props.children}
        </View>
      </TouchableOpacity>
    </IncrementalContainer>
  );
}

const Row = (props: Object) => <View style={styles.row} {...props} />;

class IncrementalExample extends React.Component<mixed, {stats: ?Object}> {
  static title = '<Incremental*>';
  static description = 'Enables incremental rendering of complex components.';
  start: number;
  constructor(props: mixed, context: mixed) {
    super(props, context);
    this.start = performanceNow();
    this.state = {
      stats: null,
    };
    (this: any)._onDone = this._onDone.bind(this);
  }
  _onDone() {
    const onDoneElapsed = performanceNow() - this.start;
    setTimeout(() => {
      const stats = {
        onDoneElapsed,
        totalWidgets,
        ...JSEventLoopWatchdog.getStats(),
        setTimeoutElapsed: performanceNow() - this.start,
      };
      stats.avgStall = stats.totalStallTime / stats.stallCount;
      this.setState({stats});
      console.log('onDone:', stats);
    }, 0);
  }
  render(): React.Node {
    return (
      <IncrementalGroup
        disabled={false}
        name="root"
        onDone={this._onDone}>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.headerText}>
            Press and hold on a row to pause rendering.
          </Text>
          {this.state.stats && <Text>
            Finished: {JSON.stringify(this.state.stats, null, 2)}
          </Text>}
          {Array(8).fill().map((_, blockIdx) => {
            return (
              <Block key={blockIdx} idx={blockIdx} stream={blockIdx < 2}>
                {Array(4).fill().map((_b, rowIdx) => (
                  <Row key={rowIdx}>
                    {Array(14).fill().map((_c, widgetIdx) => (
                      <Incremental key={widgetIdx} name={'w_' + widgetIdx}>
                        <SlowWidget idx={widgetIdx} />
                      </Incremental>
                    ))}
                  </Row>
                ))}
              </Block>
            );
          })}
        </ScrollView>
      </IncrementalGroup>
    );
  }
}

function burnCPU(milliseconds) {
  const start = performanceNow();
  while (performanceNow() < (start + milliseconds)) {}
}

var styles = StyleSheet.create({
  scrollView: {
    margin: 10,
    backgroundColor: 'white',
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    margin: 10,
  },
  block: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#a52a2a',
    padding: 14,
    margin: 5,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  widgetContainer: {
    backgroundColor: '#dddddd',
    padding: 2,
    margin: 2,
  },
  widgetText: {
    color: 'black',
    fontSize: 4,
  },
});

module.exports = IncrementalExample;
