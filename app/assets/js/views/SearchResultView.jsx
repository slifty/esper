import React from 'react';
import * as Rb from 'react-bootstrap';
import {observer} from 'mobx-react';
import {observable} from 'mobx';
import {Box, FrameView} from './FrameView.jsx';

class Options {
  @observable results_per_page = 50;
  @observable annotation_opacity = 1.0;
  @observable show_pose = true;
  @observable show_face = true;
  @observable show_hands = true;
  @observable show_lr = false;
}

window.OPTIONS = new Options;

// Displays results with basic pagination
@observer
class ClipsView extends React.Component {
  state = {
    page: 0
  }

  _numPages = () => {
    return Math.floor((window.search_result.result.length - 1)/ window.OPTIONS.results_per_page);
  }

  _prevPage = (e) => {
    e.preventDefault();
    this.setState({page: Math.max(this.state.page - 1, 0)});
  }

  _nextPage = (e) => {
    e.preventDefault();
    this.setState({page: Math.min(this.state.page + 1, this._numPages())});
  }

  render () {
    return (
      <div className='clips'>
        <div>
          {_.range(window.OPTIONS.results_per_page * this.state.page,
                   Math.min(window.OPTIONS.results_per_page * (this.state.page + 1),
                            window.search_result.result.length))
            .map((i) => <ClipView key={i} clip={window.search_result.result[i]} />)}
          <div className='clearfix' />
        </div>
        <div className='page-buttons'>
          <Rb.ButtonGroup>
            <Rb.Button onClick={this._prevPage}>&larr;</Rb.Button>
            <Rb.Button onClick={this._nextPage}>&rarr;</Rb.Button>
            <span className='page-count'>{this.state.page + 1}/{this._numPages()}</span>
          </Rb.ButtonGroup>
        </div>
      </div>
    );
  }
}


class ClipView extends React.Component {
  state = {
    hover: false,
    showVideo: false,
    loadingVideo: false,
    expand: false,
  }

  fullScreen = false

  constructor() {
    super();
    document.addEventListener('webkitfullscreenchange', this._onFullScreen);
    this._timer = null;
  }

  _onFullScreen = () => {
    this.fullScreen = !this.fullScreen;
  }

  _onKeyPress = (e) => {
    let chr = String.fromCharCode(e.which);
    if (chr == 'p') {
      this.setState({
        showVideo: false,
        loadingVideo: true
      });
    } else if (chr == 'f') {
      this.setState({expand: !this.state.expand});
    }
  }

  _onMouseEnter = () => {
    document.addEventListener('keypress', this._onKeyPress);
    this.setState({hover: true});
  }

  _onMouseLeave = () => {
    document.removeEventListener('keypress', this._onKeyPress);

    if (this._video) {
      this._video.removeEventListener('seeked', this._onSeeked);
      this._video.removeEventListener('loadeddata', this._onLoadedData);
      this._video.removeEventListener('timeupdate', this._onTimeUpdate);
    }

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this.setState({hover: false, showVideo: false, loadingVideo: false});
  }

  _onClick = () => {
    console.log('Clicked SearchResultView', this.props.clip.objects[0].id);
  }

  _toSeconds = (frame) => {
    return frame / this._videoMeta().fps;
  }

  _onSeeked = () => {
    this.setState({showVideo: true, loadingVideo: false});
  }

  _onLoadedData = () => {
    this._video.currentTime = this._toSeconds(this._frameMeta('start').number);
  }

  _onTimeUpdate = () => {
    if (!this.fullScreen &&
        this._frameMeta('end') !== undefined &&
        this._video.currentTime >= this._toSeconds(this._frameMeta('end').number)) {
      this._video.currentTime = this._toSeconds(this._frameMeta('start').number);
    }
  }

  componentDidUpdate() {
    if (this._video != null) {
      this._video.addEventListener('seeked', this._onSeeked);
      this._video.addEventListener('loadeddata', this._onLoadedData);
      this._video.addEventListener('timeupdate', this._onTimeUpdate);
    }
  }

  _videoMeta = () => {
    return window.search_result.videos[this.props.clip.video];
  }

  _frameMeta = (ty) => {
    return window.search_result.frames[this.props.clip[ty + '_frame']]
  }

  componentWillUnmount() {
    document.removeEventListener('keypress', this._onKeyPress);
  }

  render() {
    let clip = this.props.clip;
    let vidStyle = this.state.showVideo ? {'zIndex': 2} : {};
    let video = this._videoMeta();
    let frame = this._frameMeta('start');
    let path = `/server_media/thumbnails/${window.search_result.dataset}/frame_${clip.start_frame}.jpg`;

    let img_width = this.state.expand ? '780px' : (video.width * (100 / video.height));
    let meta = [];

    if (this.state.expand) {
      meta.push(['Video', `${video.path.split(/[\\/]/).pop()} (${video.id})`]);
      meta.push(['Frame', `${frame.number} (${frame.id})`]);
    }

    if (clip.end_frame !== undefined) {
      let duration = (clip.end_frame - clip.start_frame) / video.fps;
      meta.push(['Duration', `${duration.toFixed(1)}s`]);
    }

    meta.push(['# objects', `${clip.objects.length}`]);

    let meta_per_row = this.state.expand ? 4 : 2;
    let td_style = {width: `${100 / meta_per_row}%`};

    return (
      <div className={'search-result ' + (this.state.expand ? 'expanded' : '')}
           onMouseEnter={this._onMouseEnter}
           onMouseLeave={this._onMouseLeave}
           onClick={this._onClick}>
        {this.state.loadingVideo || this.state.showVideo
         ? <video autoPlay controls muted ref={(n) => {this._video = n;}} style={vidStyle}>
           <source src={`/system_media/${video.path}`} />
         </video>
         : <div />}
        {this.state.loadingVideo
         ? <div className='loading-video'><img className='spinner' /></div>
         : <div />}
        <FrameView
            bboxes={clip.objects}
            width={video.width}
            height={video.height}
            onClick={this.props.onBoxClick}
            expand={this.state.expand}
            path={path} />
        <table className='search-result-meta' style={{width: img_width}}>
          <tbody>
            {_.range(Math.ceil(meta.length/meta_per_row)).map((i) =>
              <tr key={i}>
                {_.range(meta_per_row).map((j) => {
                   let entry = meta[i*meta_per_row + j];
                   if (entry === undefined) { return <td key={j} />; }
                   return (<td key={j} style={td_style}><strong>{entry[0]}</strong>: {entry[1]}</td>);
                 })}
              </tr>)}
          </tbody>
        </table>
      </div>
    );
  }
}

class OptionsView extends React.Component {
  _onChangeOpacity = (e) => {
    window.OPTIONS.annotation_opacity = e.target.value;
  }

  _onChangeShowHands = (e) => {
    window.OPTIONS.show_hands = e;
  }

  render() {
    let fields = [
      {
        name: 'Results per page',
        key: 'results_per_page',
        type: 'number',
        opts: {
          min: 1,
          max: 500
        }
      },
      {
        name: 'Annotation opacity',
        key: 'annotation_opacity',
        type: 'range',
        opts: {
          min: 0,
          max: 1,
          step: 0.1
        },
      },
      {
        name: 'Show hands',
        key: 'show_hands',
        type: 'radio',
      },
      {
        name: 'Show pose',
        key: 'show_pose',
        type: 'radio',
      },
      {
        name: 'Show face',
        key: 'show_face',
        type: 'radio',
      },
      {
        name: 'Show left/right (blue/red)',
        key: 'show_lr',
        type: 'radio'
      }
    ]

    return <div className='options'>
      <h2>Options</h2>
      <form>
        {fields.map((field, i) =>
           <Rb.FormGroup key={i}>
             <Rb.ControlLabel>{field.name}</Rb.ControlLabel>
             {{
                range: () => (
                  <input type="range" min={field.opts.min} max={field.opts.max}
                         step={field.opts.step} defaultValue={window.OPTIONS[field.key]}
                         onChange={(e) => {window.OPTIONS[field.key] = e.target.value}} />),
                number: () => (
                  <Rb.FormControl type="number" min={field.opts.min} max={field.opts.max}
                         defaultValue={window.OPTIONS[field.key]}
                         onKeyPress={(e) => {if (e.key === 'Enter') {
                             window.OPTIONS[field.key] = e.target.value; e.preventDefault();
                           }}} />),
                radio: () => (
                  <Rb.ButtonToolbar>
                    <Rb.ToggleButtonGroup type="radio" name={field.key} defaultValue={window.OPTIONS[field.key]}
                                          onChange={(e) => {window.OPTIONS[field.key] = e}}>
                      <Rb.ToggleButton value={true}>Yes</Rb.ToggleButton>
                      <Rb.ToggleButton value={false}>No</Rb.ToggleButton>
                    </Rb.ToggleButtonGroup>
                  </Rb.ButtonToolbar>)
             }[field.type]()}
           </Rb.FormGroup>
        )}
      </form>
    </div>;
  }
}

class MetadataView extends React.Component {
  render() {
    return <div className='metadata'>
      <h2>Metadata</h2>
      <div className='meta-block colors'>
        <strong>Labelers</strong>
        {_.values(window.search_result.labelers).map((labeler, i) =>
          <div key={i}>
            {labeler.name}: &nbsp;
            <div style={{backgroundColor: window.search_result.labeler_colors[labeler.id],
                         width: '10px', height: '10px', display: 'inline-box'}} />
          </div>
        )}
      </div>
      <div className='meta-block'>
        <strong>Count:</strong> {window.search_result.count}
      </div>
    </div>;
  }
}

@observer
export default class SearchResultView extends React.Component {
  render() {
    return (
      <div className='search-results'>
        <div className='sidebar left'>
          <MetadataView />
        </div>
        <div className='sidebar right'>
          <OptionsView />
        </div>
        <ClipsView />
      </div>
    )
  }
}
