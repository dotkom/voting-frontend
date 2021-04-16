import React, { useState } from 'react';
import { Alternative as AlternativeType } from '../../__generated__/graphql-types';
import Alternative from '../atoms/Alternative';
import { ComponentStyleConfig, useStyleConfig, Grid, systemProps } from '@chakra-ui/react';

export interface AlternativeContainerProps {
  alternatives: Array<AlternativeType>;
  blankVotes: boolean;
  handleSelect: (id: string | null) => void;
}

const AlternativeContainer: React.FC<AlternativeContainerProps> = ({ alternatives, blankVotes, handleSelect }) => {
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);

  function updateSelected(id: string) {
    setSelectedAlternativeId(selectedAlternativeId === id ? null : id);
    handleSelect(selectedAlternativeId);
  }

  const containerStyles = useStyleConfig('AlternativeContainer');
  const alternativeStyle = useStyleConfig('Alternative');

  return (
    <Grid gap="1.5em" w="100%" templateColumns={`repeat(auto-fit, minmax(${alternativeStyle.minWidth}, 1fr))`}>
      {alternatives.map((alt) => (
        <Alternative
          alternative={alt}
          key={alt.id}
          selected={alt.id === selectedAlternativeId}
          onClick={() => updateSelected(alt.id)}
        ></Alternative>
      ))}
      {blankVotes && (
        <Alternative
          alternative={{ id: '0', text: 'Stem blankt', votationId: '0' }}
          key={0}
          selected={'0' === selectedAlternativeId}
          onClick={() => updateSelected('0')}
        ></Alternative>
      )}
    </Grid>
  );
};

export const AlternativeContainerConfig: ComponentStyleConfig = {
  baseStyle: {},
};

export default AlternativeContainer;
