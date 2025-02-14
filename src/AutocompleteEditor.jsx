import React, { useState, useEffect, useRef } from 'react';
import { Editor, EditorState, Modifier, SelectionState, getDefaultKeyBinding, RichUtils } from 'draft-js';
import './styles.css';
const suggestions = [
  'apple', 'banana', 'cherry', 'date', 'orange', 'grape', 'kiwi', 'melon', 'pear', 'plum', 'watermelon',
  'ruby', 'javascript', 'python', 'html', 'css', 'react', 'nodejs', 'vue', 'angular', 'typescript',
  'database', 'server', 'cloud', 'api', 'microservices', 'authentication', 'graphql', 'express', 'docker',
];

const AutocompleteEditor = () => {
  const editorRef = useRef(null);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [autocomplete, setAutocomplete] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompletedEntry, setAutocompletedEntry] = useState(null);
  const [autocompletedRange, setAutocompletedRange] = useState(null);

  const getMatchString = (blockText, anchorOffset) => {
    const matchStart = blockText.lastIndexOf('<>', anchorOffset);
    if (matchStart === -1) return null;
    return blockText.slice(matchStart + 2, anchorOffset);
  };

  useEffect(() => {
    const currentContent = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const anchorOffset = selection.getAnchorOffset();
    const blockText = currentContent.getBlockForKey(selection.getStartKey()).getText();

    const matchString = getMatchString(blockText, anchorOffset);
    if (matchString) {
      setShowSuggestions(true);
      const filteredSuggestions = suggestions.filter(s => s.startsWith(matchString));
      setAutocomplete(filteredSuggestions);
      setHighlightedIndex(0);
    } else {
      setShowSuggestions(false);
      setAutocomplete([]);
    }
  }, [editorState]);

  const insertSuggestion = (suggestion) => {
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const anchorOffset = selection.getAnchorOffset();
    const blockKey = selection.getStartKey();
    const blockText = contentState.getBlockForKey(blockKey).getText();
    const matchStart = blockText.lastIndexOf('<>', anchorOffset);

    const newContentState = Modifier.replaceText(
      contentState,
      new SelectionState({
        anchorKey: blockKey,
        anchorOffset: matchStart + 2,
        focusKey: blockKey,
        focusOffset: anchorOffset,
      }),
      suggestion
    );

    const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters');
    setEditorState(newEditorState);
    setAutocompletedEntry(suggestion);
    setAutocompletedRange(new SelectionState({
      anchorKey: blockKey,
      anchorOffset: matchStart + 2,
      focusKey: blockKey,
      focusOffset: matchStart + 2 + suggestion.length,
    }));
    setShowSuggestions(false);

    const newSelectionState = new SelectionState({
      anchorKey: blockKey,
      anchorOffset: matchStart + 2 + suggestion.length,
      focusKey: blockKey,
      focusOffset: matchStart + 2 + suggestion.length,
    });
    setEditorState(EditorState.forceSelection(newEditorState, newSelectionState));
  };

  const handleArrowKey = (direction) => {
    setHighlightedIndex((prevIndex) => {
      if (direction === 'down') return Math.min(prevIndex + 1, autocomplete.length - 1);
      if (direction === 'up') return Math.max(prevIndex - 1, 0);
      return prevIndex;
    });
  };

  const keyBindingFn = (e) => {
    if (e.keyCode === 38) {
      handleArrowKey('up');
      return 'handled';
    }
    if (e.keyCode === 40) {
      handleArrowKey('down');
      return 'handled';
    }
    if (e.keyCode === 13 || e.keyCode === 9) {
      const selectedSuggestion = autocomplete[highlightedIndex];
      if (selectedSuggestion) {
        insertSuggestion(selectedSuggestion);
      }
      return 'handled';
    }
    return getDefaultKeyBinding(e);
  };

  const handleChange = (newState) => {
    setEditorState(newState);
    if (autocompletedEntry && newState.getSelection().isCollapsed() && newState.getSelection().getAnchorOffset() < autocompletedRange.getEndOffset()) {
      setAutocompletedEntry(null);
      setAutocompletedRange(null);
    }
  };

  const handleBackspace = (e) => {
    const selection = editorState.getSelection();
    if (autocompletedEntry && selection.isCollapsed() && selection.getAnchorOffset() === autocompletedRange.getEndOffset()) {
      e.preventDefault();
      const contentState = editorState.getCurrentContent();
      const newContentState = Modifier.removeRange(contentState, autocompletedRange, 'remove-range');
      const newEditorState = EditorState.push(editorState, newContentState, 'remove-range');
      setEditorState(newEditorState);
      setAutocompletedEntry(null);
      setAutocompletedRange(null);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Editor
        editorState={editorState}
        onChange={handleChange}
        handleKeyCommand={(command) => 'not-handled'}
        keyBindingFn={keyBindingFn}
        placeholder="This is the Editor"
        ref={editorRef}
        onKeyDown={handleBackspace}
      />
      {showSuggestions && autocomplete.length > 0 && (
        <ul style={{
          zIndex: 1,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          listStyleType: 'none',
          padding: 0,
          margin: 0,
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {autocomplete.map((suggestion, index) => (
            <li
              key={suggestion}
              style={{
                  padding: '8px',
                  backgroundColor: index === highlightedIndex ? '#ddd' : 'white',
                  cursor: 'pointer',
              }}
              onMouseDown={() => insertSuggestion(suggestion)}
            >
              {suggestion}
            </li>
          ))}
      </ul>
    )}
    </div>
  );
};

export default AutocompleteEditor;
