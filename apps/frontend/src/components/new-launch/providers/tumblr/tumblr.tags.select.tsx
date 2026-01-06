'use client';

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { ReactTags } from 'react-tag-autocomplete';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const TumblrTagsSelect: FC<{
  name: string;
  label: string;
  onChange: (event: {
    target: {
      value: any[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, label } = props;
  const { getValues } = useSettings();
  const [tagValue, setTagValue] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string>('');
  const t = useT();

  const onDelete = useCallback(
    (tagIndex: number) => {
      console.log("Delete tag " + tagIndex)
      const modify = tagValue.filter((_, i) => i !== tagIndex);
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue]
  );

  const onAddition = useCallback(
    (newTag: any) => {
      console.log(newTag);
      const newTagNames: any[] = [...new Set([newTag.value].flatMap(t => t.split('#'))
        .flatMap(t => t.split(','))
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length <= 140)
        .filter(t => !tagValue.some(othertag => othertag.value === t)))]

       
      const modify = tagValue.concat(newTagNames.map(t => {return {label: t, value: t}})).slice(0, 30)
      setTagValue(modify);
      onChange({
        target: {
          value: modify,
          name,
        },
      });
    },
    [tagValue]
  );

  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setTagValue(settings);
    }
  }, []);

  const suggestionsArray = useMemo(() => {
    if (suggestions.length <= 0 || tagValue.some(tag => tag.label === suggestions)) {
      return tagValue
    } else {
      return [
        ...tagValue,
        {
          label: suggestions,
          value: suggestions
        }
      ]
    }
  }, [suggestions, tagValue]);

  return (
    <div>
      <div className={`text-[14px] mb-[6px]`}>{label}</div>
      <ReactTags
        placeholderText={t('add_a_tag', 'Add a tag')}
        suggestions={suggestionsArray}
        selected={tagValue}
        onAdd={onAddition}
        onInput={setSuggestions}
        onDelete={onDelete}
        delimiterKeys={['Enter', '#', ',']}
      />
    </div>
  );
};
