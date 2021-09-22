import React, { useEffect, useState } from 'react';
import {
  Alternative as AlternativeType,
  Participant,
  Role,
  VotationStatus,
  useCastVoteMutation,
  useGetVotationByIdQuery,
  useVotationStatusUpdatedSubscription,
  useNewVoteRegisteredSubscription,
  useGetWinnerOfVotationQuery,
  VotationType,
  useCastBlankVoteMutation,
  useCastStvVoteMutation,
  Alternative,
  useGetVotationResultsLazyQuery,
  AlternativeResult,
  useVotationOpenedForMeetingSubscription,
} from '../__generated__/graphql-types';
import { Heading, Text, Box, Center, VStack, Divider, Link, Button } from '@chakra-ui/react';
import Loading from '../components/common/Loading';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useHistory } from 'react-router';
import VotationResult from '../components/activeVotation/VotationResult';
import { h1Style } from '../components/styles/formStyles';
import VotationController from '../components/activeVotation/ActiveVotationController';
import { centerContainer, outerContainer } from '../components/styles/containerStyles';
import CastVote from '../components/activeVotation/CastVote';
import { ArrowBackIcon } from '@chakra-ui/icons';
import CheckResults from '../components/activeVotation/CheckResults';
import LobbyNavigation from '../components/meetingLobby/LobbyNavigation';
import { offwhite } from '../components/styles/theme';

export const subtitlesStyle = {
  fontStyle: 'normal',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '150%',
} as React.CSSProperties;

export type AlternativeWithIndex = AlternativeType & {
  index: number;
};

const Votation: React.FC = () => {
  const { user } = useAuth0();
  const { meetingId, votationId } = useParams<{ meetingId: string; votationId: string }>();
  const history = useHistory();

  //Get votation data and participants from meeting
  const { data, loading, error, refetch } = useGetVotationByIdQuery({
    variables: { votationId: votationId, meetingId: meetingId },
  });

  const { data: winnerResult, refetch: refetchWinner } = useGetWinnerOfVotationQuery({ variables: { votationId } });

  const [getResult, { data: votationResultData }] = useGetVotationResultsLazyQuery({
    variables: { votationId },
    fetchPolicy: 'cache-and-network',
  });

  const [castStvVote, { loading: stvLoading, error: castStvError }] = useCastStvVoteMutation();

  const { data: votationOpened } = useVotationOpenedForMeetingSubscription({
    variables: {
      meetingId,
    },
  });

  const { data: newStatusResult } = useVotationStatusUpdatedSubscription({
    variables: { id: votationId },
  });

  const { data: newVoteCountResult } = useNewVoteRegisteredSubscription({
    variables: { votationId },
  });

  const [status, setStatus] = useState<VotationStatus | null>(null);
  const [userHasVoted, setUserHasVoted] = useState<boolean>(false);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [participantRole, setParticipantRole] = useState<Role | null>(null);
  const [isVotingEligible, setIsVotingEligible] = useState(false);
  const [winners, setWinners] = useState<AlternativeType[] | AlternativeResult[] | null>(null);
  // when page is refreshed and votes are not hidden, what we say the
  // user has voted is not correct, and therefore the user should not
  // be able to unhide vote
  const [disableToggleShowVote, setDisableToggleShowVote] = useState(true);

  //Handle selected Alternative
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeWithIndex[] | undefined>(undefined);

  const [showVote, setShowVote] = useState<boolean>(false);

  const handleSelect = (id: string | null) => setSelectedAlternativeId(id);

  useEffect(() => {
    // reset state if votation is changed
    refetch();
    setWinners(null);
    setDisableToggleShowVote(true);
    setSelectedAlternativeId(null);
    setAlternatives(undefined);
    setShowVote(false);
    setStatus(null);
    setVoteCount(0);
    setUserHasVoted(false);
  }, [votationId, refetch]);

  // Update winner when a new winner result from getWinnerOfVotation is received
  useEffect(() => {
    if (winnerResult?.getWinnerOfVotation && !winners) {
      const result = winnerResult.getWinnerOfVotation as Alternative[];
      if (result.length > 0) {
        setWinners(
          result.map((a) => {
            return { id: a.id, text: a.text, votationId: a.votationId };
          })
        );
      }
    }
  }, [winnerResult, winners]);

  // fetch result or winners when status has changed
  useEffect(() => {
    if (
      (status === VotationStatus.CheckingResult && participantRole !== Role.Participant) ||
      (status === VotationStatus.PublishedResult &&
        (participantRole !== Role.Participant || data?.votationById?.hiddenVotes === false))
    ) {
      getResult();
    } else if (!winnerResult && status === VotationStatus.PublishedResult) {
      refetchWinner();
    }
  }, [status, participantRole, data?.votationById?.hiddenVotes, getResult, refetchWinner, winnerResult]);

  // Update winner of votation when new result is received from getVotationResult
  useEffect(() => {
    if (votationResultData?.getVotationResults && !winners) {
      const winners = votationResultData.getVotationResults.alternatives.filter(
        (a) => a?.isWinner
      ) as AlternativeResult[];
      setWinners(winners.length > 0 ? winners : null);
    }
  }, [votationResultData, winners]);

  // Update role after data of participants is received
  useEffect(() => {
    if (data?.meetingById?.participants) {
      const participants = data?.meetingById?.participants as Array<Participant>;
      const participant = participants.filter((participant) => `auth0|${participant.user?.id}` === user?.sub)[0];
      if (participantRole !== participant.role) setParticipantRole(participant.role);
      if (isVotingEligible !== participant.isVotingEligible) setIsVotingEligible(participant.isVotingEligible);
    }
  }, [data?.meetingById, user?.sub, participantRole, isVotingEligible]);

  // set alternatives when data arrives
  useEffect(() => {
    if (data?.votationById?.alternatives && !alternatives) {
      const alternatives = data.votationById.alternatives.filter((a) => a) as AlternativeType[];
      const shuffledAlternatives = shuffleAlternatives(alternatives);
      setAlternatives(
        shuffledAlternatives.map((a, index) => {
          return {
            ...a,
            index,
          };
        })
      );
    }
  }, [data?.votationById?.alternatives, alternatives]);

  // update initial votationStatus
  useEffect(() => {
    if (data?.votationById?.status) {
      setStatus(data.votationById.status);
    }
  }, [data?.votationById?.status]);

  // update initial vote count when data arrives on votation
  useEffect(() => {
    if (data?.votationById?.hasVoted && data.votationById.hasVoted.length > voteCount) {
      setVoteCount(data.votationById.hasVoted.length);
    }
  }, [data?.votationById?.hasVoted, voteCount]);

  // update initial userHasVoted when data arrives on votation
  useEffect(() => {
    if (data?.votationById?.hasVoted && user?.sub) {
      setUserHasVoted(data.votationById.hasVoted.map((hasVoted) => `auth0|${hasVoted}`).includes(user?.sub));
    }
  }, [data?.votationById?.hasVoted, user]);

  // update status of votation when new data arrives on subscription
  useEffect(() => {
    const votationStatus = newStatusResult?.votationStatusUpdated?.votationStatus ?? null;
    const statusForVotationId = newStatusResult?.votationStatusUpdated?.votationId ?? null;
    if (votationStatus !== null && statusForVotationId === votationId && votationStatus !== status) {
      setStatus(votationStatus);
    }
  }, [newStatusResult, status, votationId]);

  // update vote count when new vote count arrives from subscription
  useEffect(() => {
    if (
      !newVoteCountResult?.newVoteRegistered ||
      newVoteCountResult.newVoteRegistered.voteCount === voteCount ||
      newVoteCountResult.newVoteRegistered.votationId !== votationId
    )
      return;
    const newVoteCount = newVoteCountResult.newVoteRegistered.voteCount;
    setVoteCount(newVoteCount);
  }, [newVoteCountResult, voteCount, votationId]);

  // go to new votation if another votation opens
  useEffect(() => {
    if (votationOpened && votationOpened.votationOpenedForMeeting !== votationId) {
      history.push(`/meeting/${meetingId}/votation/${votationOpened.votationOpenedForMeeting}`);
    }
  }, [votationOpened, history, meetingId, votationId]);

  //Register the vote
  const [castVote, { loading: castVoteLoading, error: castVoteError }] = useCastVoteMutation();
  const [castBlankVote, { loading: blankVoteLoading, error: blankVoteError }] = useCastBlankVoteMutation();

  const submitVote = async () => {
    if (data?.votationById?.type === VotationType.Stv && alternatives) {
      await castStvVote({
        variables: {
          votationId,
          alternatives: alternatives.map((a) => {
            return {
              alternativeId: a.id,
              ranking: a.index,
            };
          }),
        },
      });
    } else if (selectedAlternativeId !== null) {
      if (selectedAlternativeId === 'BLANK') {
        await castBlankVote({ variables: { votationId: votationId } });
      } else {
        await castVote({ variables: { alternativeId: selectedAlternativeId } });
      }
    }
    setUserHasVoted(true);
    setDisableToggleShowVote(false);
  };

  const backToVotationList = () => {
    history.push(`/meeting/${meetingId}`);
  };

  const shuffleAlternatives = (alternatives: AlternativeType[]) => {
    let currentIndex = alternatives.length;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [alternatives[currentIndex], alternatives[randomIndex]] = [alternatives[randomIndex], alternatives[currentIndex]];
    }

    return alternatives;
  };

  if (error?.message === 'Not Authorised!') {
    return (
      <Center mt="40vh">
        <Text>
          Du har ikke tilgang til denne voteringen,{' '}
          <Link href="/" textDecoration="underline">
            gå tilbake til hjemmesiden.
          </Link>
        </Text>
      </Center>
    );
  }

  if (loading) {
    return (
      <Center mt="10vh">
        <Loading asOverlay={false} text={'Henter votering'} />
      </Center>
    );
  }

  if (error || data?.votationById?.id === undefined) {
    return (
      <Center mt="10vh">
        <Text>Det skjedde noe galt under innlastingen</Text>
      </Center>
    );
  }

  if (status === VotationStatus.Upcoming) {
    return (
      <Center mt="10vh">
        <Text>Denne voteringen har ikke åpnet enda, men vil dukke opp her automatisk så fort den åpner.</Text>
      </Center>
    );
  }

  if (castStvError || castVoteError || blankVoteError) {
    return (
      <Center mt="10vh">
        <Text>Det skjedde noe galt med registreringen av stemmen din. Oppdatert siden og prøv på ny.</Text>
      </Center>
    );
  }

  return (
    <React.Fragment key={data.votationById.id}>
      <Box bg={offwhite} w="100vw" color="gray.500" display="flex" flexDirection="column" alignItems="center">
        {participantRole === Role.Admin && <LobbyNavigation meetingId={meetingId} location="activeVotation" />}
        <Center sx={outerContainer}>
          {(castVoteLoading || blankVoteLoading || stvLoading) && (
            <Loading text="Registrerer stemme" asOverlay={true} />
          )}
          <VStack sx={centerContainer} maxWidth="800px" alignItems="left" spacing="3em">
            <VStack alignItems="left" spacing="0.5rem">
              <Heading as="h1" style={subtitlesStyle}>
                Votering {data.votationById.index + 1}
              </Heading>
              <Heading as="h1" sx={h1Style}>
                {data.votationById.title}
              </Heading>

              <Text mt="1em" mb="2em">
                {data.votationById.description}
              </Text>
            </VStack>

            {status === VotationStatus.Open && (
              <CastVote
                alternatives={alternatives || []}
                handleSelect={handleSelect}
                blankVotes={data.votationById.blankVotes || false}
                submitVote={submitVote}
                submitButtonDisabled={selectedAlternativeId === null && data.votationById.type !== VotationType.Stv}
                voteCount={voteCount}
                votingEligibleCount={data?.getVoteCount?.votingEligibleCount}
                isStv={data.votationById.type === VotationType.Stv}
                updateAlternatives={setAlternatives}
                userHasVoted={userHasVoted}
                showVote={showVote}
                isVotingEligible={isVotingEligible}
              />
            )}
            {status === VotationStatus.CheckingResult && participantRole === Role.Participant && (
              <Box>
                <Loading asOverlay={false} text={'Resultatene sjekkes'} />
              </Box>
            )}
            {status === VotationStatus.CheckingResult &&
              (participantRole === Role.Counter || participantRole === Role.Admin) && (
                <CheckResults
                  result={votationResultData}
                  isStv={data.votationById.type === VotationType.Stv}
                  role={participantRole}
                  votationId={votationId}
                  meetingId={meetingId}
                />
              )}
            {status === VotationStatus.PublishedResult && (
              <Box mt="4em">
                <VotationResult
                  result={votationResultData}
                  votationId={votationId}
                  showResultsTable={!data.votationById.hiddenVotes}
                  backToVotationList={backToVotationList}
                  winners={winners}
                />
              </Box>
            )}
            {status === VotationStatus.Invalid && (
              <VStack>
                <Text>Voteringen er erklært ugyldig</Text>
                <Button borderRadius={'16em'} onClick={backToVotationList} leftIcon={<ArrowBackIcon />}>
                  Gå tilbake til liste over voteringer
                </Button>
              </VStack>
            )}
            {(status === VotationStatus.Open || status === VotationStatus.CheckingResult) && (
              <VStack>
                <Divider />
                <VotationController
                  showVote={showVote}
                  toggleShowVote={() => setShowVote(!showVote)}
                  votationId={votationId}
                  status={status}
                  disableShowVote={disableToggleShowVote}
                  role={participantRole}
                />
              </VStack>
            )}
          </VStack>
        </Center>
      </Box>
    </React.Fragment>
  );
};

export default Votation;
