import React, { useState } from 'react';
import AddVotationForm from './AddVotationForm';
import { Droppable } from 'react-beautiful-dnd';
import { Heading, VStack } from '@chakra-ui/react';

import { Votation } from '../../types/types';
import StartNextVotationButton from '../atoms/StartNextVotationButton';

interface VotationListSectionProps {
  votations: Votation[];
  setActiveVotationId: (id: string) => void;
  activeVotationId: string;
  updateVotation: (votation: Votation) => void;
  handleDeleteVotation: (votation: Votation) => void;
  handleDeleteAlternative: (alternativeId: string, votationId: string) => void;
  duplicateVotation: (votation: Votation) => void;
  handleStartVotation: () => void;
  checkIfAnyChanges: () => boolean;
  handleSaveChanges: () => void;
  showStartNextButton: boolean;
  heading?: string;
  droppableId: string;
  isAdmin: boolean;
}

const VotationListSection: React.FC<VotationListSectionProps> = ({
  votations,
  setActiveVotationId,
  activeVotationId,
  updateVotation,
  handleDeleteVotation,
  handleDeleteAlternative,
  duplicateVotation,
  handleStartVotation,
  checkIfAnyChanges,
  handleSaveChanges,
  showStartNextButton,
  heading,
  droppableId,
  isAdmin,
}) => {
  return (
    <VStack spacing="16px" alignItems="start">
      {heading && votations.length > 0 && (
        <Heading as="h1" fontSize="1em" mb="1.125em">
          {heading}
        </Heading>
      )}
      <Droppable droppableId={droppableId} isDropDisabled={!isAdmin}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {votations.map((votation: Votation) => (
              <AddVotationForm
                toggleCollapsedVotation={() => setActiveVotationId(votation.id)}
                isActive={votation.id === activeVotationId}
                votation={votation}
                index={votation.index}
                key={votation.id}
                updateVotation={updateVotation}
                deleteVotation={handleDeleteVotation}
                deleteAlternative={handleDeleteAlternative}
                duplicateVotation={duplicateVotation}
                isAdmin={isAdmin}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {showStartNextButton && votations.length > 0 && votations[0].existsInDb && (
        <>
          <StartNextVotationButton
            handleStartVotation={handleStartVotation}
            checkIfAnyChanges={checkIfAnyChanges}
            handleSaveChanges={handleSaveChanges}
          />
        </>
      )}
    </VStack>
  );
};
export default VotationListSection;
