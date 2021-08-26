import React, { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Box, Button, Center, Heading, HStack, useToast, VStack, Text } from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import {
  VotationType,
  Role,
  useCreateVotationsMutation,
  useDeleteAlternativesMutation,
  useDeleteVotationsMutation,
  useUpdateVotationsMutation,
  useUpdateVotationStatusMutation,
  useVotationsByMeetingIdLazyQuery,
  VotationStatus,
} from '../../__generated__/graphql-types';
import { Votation, Alternative } from '../../types/types';
import Loading from '../atoms/Loading';
import { darkblue } from '../particles/theme';
import { collapsedStyle, highlightedStyle } from '../particles/formStyles';
import VotationListSection from './VotationListSection';

interface VotationListProps {
  meetingId: string;
  votationsMayExist: boolean;
  isMeetingLobby: boolean;
  role: Role | undefined;
}

const getEmptyAlternative = () => {
  return {
    id: uuid(),
    text: '',
    index: 0,
    existsInDb: false,
  };
};

const getEmptyVotation = (id?: string, index?: number) => {
  return {
    id: id ?? uuid(),
    title: '',
    description: '',
    index: index ?? 0,
    alternatives: [getEmptyAlternative()],
    blankVotes: false,
    status: VotationStatus.Upcoming,
    hiddenVotes: true,
    type: 'SIMPLE' as VotationType,
    majorityThreshold: 50,
    existsInDb: false,
    isEdited: false,
  };
};

const AddMeetingVotationList: React.FC<VotationListProps> = ({
  meetingId,
  votationsMayExist,
  isMeetingLobby,
  role,
}) => {
  const [getVotationsByMeetingId, { data, loading, error }] = useVotationsByMeetingIdLazyQuery({
    variables: {
      meetingId,
    },
  });

  const [updateVotations, updateVotationsResult] = useUpdateVotationsMutation();

  const [createVotations, createVotationsResult] = useCreateVotationsMutation();

  const [deleteVotations] = useDeleteVotationsMutation();

  const [votations, setVotations] = useState<Votation[]>([getEmptyVotation()]);

  const [activeVotationId, setActiveVotationId] = useState<string>(votations[0].id);

  const [deleteAlternatives] = useDeleteAlternativesMutation();

  const [updateVotationStatus, updateVotationStatusResult] = useUpdateVotationStatusMutation();

  const toast = useToast();

  const votationsAreEmpty = () => {
    if (votations.length !== 1) return;
    const votation = votations[0];
    return votation.title === '' && votation.description === '';
  };

  // If there may exist votations (you are editing meeting or already been on add votations page), fetch votations from the backend
  useEffect(() => {
    if (votationsMayExist) {
      getVotationsByMeetingId();
    }
  }, [votationsMayExist, getVotationsByMeetingId]);

  useEffect(() => {
    const toastId = 'votationOpened';
    if (updateVotationStatusResult.data?.updateVotationStatus && !toast.isActive(toastId)) {
      toast({
        id: 'votationOpened',
        title: 'Voteringen ble åpnet.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    }
  }, [updateVotationStatusResult.data?.updateVotationStatus, toast]);

  useEffect(() => {
    if (data?.meetingById?.votations && data.meetingById.votations.length > 0 && votationsAreEmpty()) {
      const votations = data.meetingById.votations as Votation[];
      const formattedVotations = formatVotations(votations) ?? [getEmptyVotation()];
      const nextVotationIndex = Math.max(...votations.map((votation) => votation.index)) + 1;
      const shouldAddEmpty =
        !isMeetingLobby && formattedVotations.filter((v) => v.status === VotationStatus.Upcoming).length === 0;
      if (shouldAddEmpty) {
        formattedVotations.push(getEmptyVotation(uuid(), nextVotationIndex));
      }
      setVotations(formattedVotations.sort((a, b) => a.index - b.index));
      setActiveVotationId(formattedVotations[formattedVotations.length - 1].id);
    }
    // eslint-disable-next-line
  }, [data]);

  useEffect(() => {
    if (!createVotationsResult.data?.createVotations || !updateVotationsResult.data?.updateVotations) return;
    toast({
      title: 'Voteringer oppdatert.',
      description: 'Voteringene har blitt opprettet',
      status: 'success',
      duration: 9000,
      isClosable: true,
    });
    const createResults = createVotationsResult.data.createVotations as Votation[];
    const updateResults = updateVotationsResult.data.updateVotations as Votation[];
    const createdVotations = formatVotations(createResults) as Votation[];
    const updatedVotations = formatVotations(updateResults) as Votation[];
    const untouchedVotations = votations.filter((v) => !v.isEdited && v.existsInDb);
    const newVotations = [...untouchedVotations, ...createdVotations, ...updatedVotations] as Votation[];
    setVotations(newVotations.sort((a, b) => a.index - b.index));
    // eslint-disable-next-line
  }, [createVotationsResult.data?.createVotations, updateVotationsResult.data?.updateVotations]);

  const formatVotation = (votation: Votation) => {
    return {
      ...votation,
      existsInDb: true,
      isEdited: false,
      alternatives:
        votation.alternatives.length > 0
          ? votation.alternatives.map((alternative: Alternative, index: number) => {
              return {
                ...alternative,
                index: index,
                existsInDb: true,
              };
            })
          : [getEmptyAlternative()],
    };
  };

  const formatVotations = (votations: Votation[]) => {
    if (!votations) return;
    return votations.map((votation) => formatVotation(votation));
  };

  const reorder = (list: Votation[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  async function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const reorderedVotations = reorder(votations, result.source.index, result.destination.index);

    const updatedVotations: Votation[] = reorderedVotations.map((votation, index) => {
      return {
        ...votation,
        index: index,
        isEdited: true,
      };
    });
    setVotations(updatedVotations);
  }

  const handleDeleteVotation = async (votation: Votation) => {
    try {
      if (votation.existsInDb) {
        await deleteVotations({
          variables: {
            ids: [votation.id],
          },
        });
      }
      const remainingVotations = votations
        .filter((v) => v.id !== votation.id)
        .sort((a, b) => a.index - b.index)
        .map((v, index) => {
          return {
            ...v,
            index,
            isEdited: true,
          };
        });
      const keyOfEmptyVotation = uuid();
      handleSave(remainingVotations);
      setVotations(remainingVotations.length > 0 ? remainingVotations : [getEmptyVotation(keyOfEmptyVotation)]);
      setActiveVotationId(
        remainingVotations.length > votation.index
          ? votations[votation.index].id
          : remainingVotations.length > 0
          ? votations[remainingVotations.length - 1].id
          : keyOfEmptyVotation
      );
      toast({
        title: 'Votering slettet.',
        description: `${votation.title} ble slettet`,
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Det oppstod et problem.',
        description: `Vi kunne ikke slette voteringen. Prøv å laste inn siden på nytt.`,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    }
  };

  const handleDeleteAlternative = async (alternativeId: string, votationId: string) => {
    try {
      await deleteAlternatives({
        variables: {
          ids: [alternativeId],
        },
      });
      const updatedVotation = votations
        .filter((v) => v.id === votationId)
        .map((v) => {
          return { ...v, alternatives: v.alternatives.filter((a) => a.id !== alternativeId) };
        });
      if (updatedVotation.length > 0) {
        updateVotation(updatedVotation[0]);
      }
      toast({
        title: 'Alternativ slettet.',
        status: 'success',
        duration: 9000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Det oppstod et problem.',
        description: `Vi kunne ikke slette alternativet. Prøv å laste inn siden på nytt.`,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    }
  };

  const updateVotation = (votation: Votation) => {
    const votationsCopy = Array.from(votations);
    const indexOfUpdatedVotation = votations.findIndex((v) => v.id === votation.id);
    votationsCopy[indexOfUpdatedVotation] = votation;
    setVotations(votationsCopy);
  };

  const duplicateVotation = (votation: Votation) => {
    const newId = uuid();
    const nextVotationIndex = Math.max(...votations.map((votation) => votation.index)) + 1;
    setVotations([...votations, { ...votation, id: newId, existsInDb: false, index: nextVotationIndex }]);
    setActiveVotationId(newId);
  };

  const handleUpdateVotations = (votations: Votation[]) => {
    const preparedVotations = votations.map((votation) => {
      return {
        id: votation.id,
        title: votation.title,
        description: votation.description,
        index: votation.index,
        blankVotes: votation.blankVotes,
        hiddenVotes: votation.hiddenVotes,
        type: votation.type,
        majorityThreshold: votation.majorityThreshold,
        alternatives: votation.alternatives
          .map((alternative) => {
            return {
              id: alternative.id,
              text: alternative.text,
            };
          })
          .filter((alternative) => alternative.text !== ''),
      };
    });
    updateVotations({ variables: { votations: preparedVotations } });
  };

  const handleCreateVotations = async (votations: Votation[]) => {
    const preparedVotations = votations.map((votation) => {
      return {
        title: votation.title,
        description: votation.description,
        index: votation.index,
        blankVotes: votation.blankVotes,
        hiddenVotes: votation.hiddenVotes,
        type: votation.type,
        majorityThreshold: votation.majorityThreshold,
        alternatives: votation.alternatives
          .map((alternative) => alternative.text)
          .filter((alternative) => alternative !== ''),
      };
    });
    createVotations({ variables: { votations: preparedVotations, meetingId } });
  };

  const handleSave = (votations: Votation[]) => {
    const validVotations = votations.filter((v) => v.title !== '');
    const votationsToCreate = validVotations.filter((votation) => !votation.existsInDb);
    const votationsToUpdate = validVotations.filter((votation) => votation.existsInDb && votation.isEdited);
    handleCreateVotations(votationsToCreate);
    handleUpdateVotations(votationsToUpdate);
  };

  if (loading) {
    return <Loading asOverlay={false} text={'Henter møte'} />;
  }

  if (error) {
    return (
      <>
        <Box h="57px" w="100vw" bgColor={darkblue}></Box>
        <Center mt="10vh">
          <Text>Det skjedde noe galt under innlastingen</Text>
        </Center>
      </>
    );
  }

  const upcomingVotations = votations.filter((v) => v.status === VotationStatus.Upcoming);
  const endedVotations = votations.filter((v) => v.status !== VotationStatus.Upcoming);

  return (
    <VStack w="100%" h="100%" alignItems="start" spacing="32px">
      {createVotationsResult.loading && <Loading asOverlay={true} text="Oppretter votering" />}
      {upcomingVotations.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          {isMeetingLobby ? (
            <>
              <VotationListSection
                droppableId={'top-list'}
                votations={upcomingVotations.slice(0, 1)}
                setActiveVotationId={setActiveVotationId}
                activeVotationId={activeVotationId}
                updateVotation={updateVotation}
                handleDeleteVotation={handleDeleteVotation}
                handleDeleteAlternative={handleDeleteAlternative}
                duplicateVotation={duplicateVotation}
                openVotation={() =>
                  updateVotationStatus({ variables: { id: upcomingVotations[0].id, status: VotationStatus.Open } })
                }
                showStartNextButton={role === Role.Admin}
                heading={'Neste votering'}
                isAdmin={role === Role.Admin}
              />
              <VotationListSection
                droppableId={'bottom-list'}
                votations={upcomingVotations.slice(1)}
                setActiveVotationId={setActiveVotationId}
                activeVotationId={activeVotationId}
                updateVotation={updateVotation}
                handleDeleteVotation={handleDeleteVotation}
                handleDeleteAlternative={handleDeleteAlternative}
                duplicateVotation={duplicateVotation}
                openVotation={() =>
                  updateVotationStatus({ variables: { id: upcomingVotations[0].id, status: VotationStatus.Open } })
                }
                showStartNextButton={false}
                heading={'Kommende voteringer'}
                isAdmin={role === Role.Admin}
              />
            </>
          ) : (
            <VotationListSection
              droppableId={'list'}
              votations={upcomingVotations}
              setActiveVotationId={setActiveVotationId}
              activeVotationId={activeVotationId}
              updateVotation={updateVotation}
              handleDeleteVotation={handleDeleteVotation}
              handleDeleteAlternative={handleDeleteAlternative}
              duplicateVotation={duplicateVotation}
              openVotation={() =>
                updateVotationStatus({ variables: { id: upcomingVotations[0].id, status: VotationStatus.Open } })
              }
              showStartNextButton={false}
              heading={'Kommende voteringer'}
              isAdmin={role === Role.Admin}
            />
          )}
        </DragDropContext>
      )}
      {role === Role.Admin && (
        <HStack w="100%" justifyContent="space-between">
          <Button
            w={'250px'}
            rightIcon={<AddIcon w={3} h={3} />}
            borderRadius={'16em'}
            onClick={() => {
              const id = uuid();
              const nextVotationIndex = Math.max(...votations.map((votation) => votation.index)) + 1;
              setVotations([...votations, { ...getEmptyVotation(id), index: nextVotationIndex }]);
              setActiveVotationId(id);
            }}
          >
            Legg til votering
          </Button>
          <Button
            disabled={votations.filter((v) => v.title !== '' && (!v.existsInDb || v.isEdited)).length === 0}
            bg="gray.500"
            color="white"
            w={'250px'}
            borderRadius={'16em'}
            onClick={() => handleSave(votations)}
          >
            Lagre endringer
          </Button>
        </HStack>
      )}
      {endedVotations.length > 0 && (
        <VStack spacing="16px" alignItems="start">
          <Heading as="h1" fontSize="1em" mb="1.125em">
            Avsluttede voteringer
          </Heading>
          {endedVotations.map((votation, index) => (
            <HStack
              w="90vw"
              maxWidth="700px"
              justify="space-between"
              marginBottom="16px"
              sx={collapsedStyle}
              cursor="default"
              opacity="0.5"
            >
              <HStack spacing="8">
                <Text sx={highlightedStyle}>{`${votation.index + 1}`}</Text>
                <Text>{votation.title}</Text>
              </HStack>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
};

export default AddMeetingVotationList;
