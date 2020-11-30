import React from 'react';
import classnames from 'classnames';
import { ReactMarkdownProps } from 'react-markdown';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { IProps } from './utils';
import TextArea, { ITextAreaProps } from './components/TextArea';
import Toolbar from './components/Toolbar';
import DragBar from './components/DragBar';
import { getCommands, TextAreaCommandOrchestrator, ICommand, CommandOrchestrator } from './commands';
import './index.less';

export interface MDEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>, IProps {
  /**
   * The Markdown value.
   */
  value?: string;
  /**
   * Event handler for the `onChange` event.
   */
  onChange?: (value?: string) => void;
  /**
   * Can be used to make `Markdown Editor` focus itself on initialization. Defaults to on.
   * it will be set to true when either the source `textarea` is focused,
   * or it has an `autofocus` attribute and no other element is focused.
   */
  autoFocus?: ITextAreaProps['autoFocus'];
  /**
   * The height of the editor.
   */
  height?: React.CSSProperties['height'];
  /**
   * Show drag and drop tool. Set the height of the editor.
   */
  visiableDragbar?: boolean;
  /**
   * Show markdown preview.
   */
  preview?: 'live' | 'edit' | 'preview';
  fullscreen?: boolean;
  /**
   * Maximum drag height. `visiableDragbar=true`
   */
  maxHeight?: number;
  /**
   * Minimum drag height. `visiableDragbar=true`
   */
  minHeight?: number;
  /**
   * This is reset [react-markdown](https://github.com/rexxars/react-markdown) settings.
   */
  previewOptions?: ReactMarkdownProps;
  /**
   * Set the `textarea` related props.
   */
  textareaProps?: ITextAreaProps;
  /**
   * The number of characters to insert when pressing tab key.
   * Default `2` spaces.
   */
  tabSize?: number;
  /**
   * You can create your own commands or reuse existing commands.
   */
  commands?: ICommand[];
  /**
   * Hide the tool bar
   */
  hideToolbar?: boolean;
  /**
   * Hide the tool bar
   */
  name?: string;
}

export interface MDEditorState {
  height: React.CSSProperties['height'];
  preview?: MDEditorProps['preview'];
  fullscreen?: boolean;
  value?: string;
}

export default class MDEditor extends React.PureComponent<MDEditorProps, MDEditorState> {
  static Markdown = MarkdownPreview;
  public static displayName = 'MDEditor';
  public preview = React.createRef<MarkdownPreview>();
  public textarea = React.createRef<TextArea>();
  public commandOrchestrator!: CommandOrchestrator;
  public leftScroll:boolean = false;
  public static defaultProps: MDEditorProps = {
    value: '',
    prefixCls: 'w-md-editor',
    height: 200,
    minHeight: 100,
    maxHeight: 1200,
    tabSize: 2,
    visiableDragbar: true,
    preview: 'live',
    fullscreen: false,
    commands: getCommands(),
  }
  public constructor(props: MDEditorProps) {
    super(props);
    this.state = {
      height: props.height,
      preview: props.preview,
      fullscreen: props.fullscreen,
      value: props.value,
    };
  }
  public componentDidMount() {
    this.handleChange(this.state.value);
    this.commandOrchestrator = new TextAreaCommandOrchestrator((this.textarea.current!.text.current || null) as HTMLTextAreaElement);
  }
  public UNSAFE_componentWillReceiveProps(nextProps: MDEditorProps) {
    if (nextProps.preview !== this.props.preview) {
      this.setState({ preview: nextProps.preview });
    }
    if (nextProps.fullscreen !== this.props.fullscreen) {
      this.setState({ fullscreen: nextProps.fullscreen });
    }
    if (nextProps.value !== this.props.value) {
      this.setState({ value: nextProps.value }, () => {
        this.handleChange(nextProps.value);
      });
    }
  }
  private handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!this.textarea.current || !this.preview.current || !this.preview.current.mdp || !this.textarea.current.warp) {
      return;
    }
    const preview = this.preview.current.mdp.current! as HTMLDivElement;
    const textarea = this.textarea.current.warp.current! as HTMLDivElement;
    if (textarea && preview) {
      const scale = (textarea.scrollHeight - textarea.offsetHeight) / (preview.scrollHeight - preview.offsetHeight);
      if (e.target === textarea && this.leftScroll) {
        preview.scrollTop = textarea.scrollTop / scale;
      }
      if (e.target === preview && !this.leftScroll) {
        textarea.scrollTop = preview.scrollTop * scale;
      }
    }
  }
  private handleChange(mdStr?: string) {
    const { onChange } = this.props;
    this.preview.current!.renderHTML(mdStr);
    onChange && onChange(mdStr || '');
  }
  public handleCommand = (command: ICommand) => {
    if (command.keyCommand === 'preview') {
      this.setState({ preview: command.value as MDEditorState['preview'] });
    }
    if (command.keyCommand === 'fullscreen') {
      this.setState({ fullscreen: !this.state.fullscreen });
      document.body.style.overflow = this.state.fullscreen ? 'initial' : 'hidden';
    }
    this.commandOrchestrator.executeCommand(command);
  }
  public render() {
    const { prefixCls, className, value, commands, height, visiableDragbar, preview, fullscreen, previewOptions, textareaProps, maxHeight, minHeight, autoFocus, tabSize, onChange, hideToolbar, name, ...other } = this.props;
    const cls = classnames(className, prefixCls, {
      [`${prefixCls}-show-${this.state.preview}`]: this.state.preview,
      [`${prefixCls}-fullscreen`]: this.state.fullscreen,
    });
    return (
      <div className={cls} style={{ height: this.state.fullscreen ? '100%' : this.state.height }} {...other}>
        {!hideToolbar && <Toolbar
          active={{
            fullscreen: this.state.fullscreen,
            preview: this.state.preview,
          }}
          prefixCls={prefixCls} commands={commands}
          onCommand={this.handleCommand}
        />}
        <div
          className={`${prefixCls}-content`}
          style={{ height: this.state.fullscreen ? 'calc(100% - 29px)' : (this.state.height as number) - 29 }}
        >
          {/(edit|live)/.test(this.state.preview as string) && (
            <TextArea
              ref={this.textarea}
              tabSize={tabSize}
              className={`${prefixCls}-input`}
              prefixCls={prefixCls}
              value={this.state.value}
              autoFocus={autoFocus}
              {...textareaProps}
              onScroll={this.handleScroll}
              onMouseOver={() => this.leftScroll = true}
              onMouseLeave={() => this.leftScroll = false}
              onChange={this.handleChange.bind(this)}
              name={name}
            />
          )}
          <MarkdownPreview
            {...previewOptions}
            ref={this.preview}
            onScroll={this.handleScroll}
            className={`${prefixCls}-preview`}
          />
          {visiableDragbar && this.state.preview !== 'preview' && !this.state.fullscreen && (
            <DragBar
              prefixCls={prefixCls}
              height={this.state.height as number}
              maxHeight={maxHeight!}
              minHeight={minHeight!}
              onChange={(newHeight) => {
                this.setState({ height: newHeight });
              }}
            />
          )}
        </div>
      </div>
    )
  }
}
