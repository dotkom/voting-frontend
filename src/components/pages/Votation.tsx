import React, { useEffect, useState } from 'react';
import {
  Alternative as AlternativeType,
  Participant,
  Role,
  VotationStatus,
  useCastVoteMutation,
  useGetVotationByIdQuery,
  // useVotationStatusUpdatedSubscription,
  // useNewVoteRegisteredSubscription,
  // useVotingEligibleCountQuery,
  useGetVoteCountQuery,
  useGetWinnerOfVotationQuery,
} from '../../__generated__/graphql-types';
import { Heading, Text, Button, Box, Center, VStack, Divider, Link } from '@chakra-ui/react';
import AlternativeList from '../molecules/AlternativeList';
import Loading from '../atoms/Loading';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams } from 'react-router';
import VotationResult from '../atoms/VotationResult';
import { h1Style } from '../particles/formStyles';
import { darkblue } from '../particles/theme';
import VotationController from '../molecules/VotationController';
import CheckResults from '../molecules/CheckResults';

const subtitlesStyle = {
  fontStyle: 'normal',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '150%',
} as React.CSSProperties;

const Votation: React.FC = () => {
  const { user } = useAuth0();
  const { meetingId, votationId } = useParams<{ meetingId: string; votationId: string }>();

  //Get votation data and participants from meeting
  const { data, loading, error } = useGetVotationByIdQuery({
    variables: { votationId: votationId, meetingId: meetingId },
    pollInterval: 1000,
  });
  const { data: winnerResult, refetch: refetchWinner } = useGetWinnerOfVotationQuery({ variables: { id: votationId } });

  // const {
  //   data: votingEligibleCountResult,
  //   loading: votingEligibleCountLoading,
  //   error: votingEligibleCountError,
  // } = useVotingEligibleCountQuery({ variables: { votationId } });

  const { data: voteCountResult, error: voteCountError, loading: voteCountLoading } = useGetVoteCountQuery({
    variables: { votationId },
    pollInterval: 1000,
  });
  // const { data: newStatusResult } = useVotationStatusUpdatedSubscription({
  //   variables: { id: votationId },
  // });

  // const { data: newVoteCountResult } = useNewVoteRegisteredSubscription({
  //   variables: { votationId },
  // });

  const [status, setStatus] = useState<VotationStatus | null>(null);
  const [userHasVoted, setUserHasVoted] = useState<boolean>(false);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [participantRole, setParticipantRole] = useState<Role | null>(null);
  const [winner, setWinner] = useState<AlternativeType | null>();

  useEffect(() => {
    if (winnerResult?.getWinnerOfVotation && !winner) {
      const result = winnerResult.getWinnerOfVotation;
      setWinner({ id: result.id, text: result.text, votationId: result.votationId });
    }
  }, [winnerResult, winner]);

  useEffect(() => {
    const newVoteCount = voteCountResult?.getVoteCount?.voteCount;
    if (newVoteCount && newVoteCount !== voteCount) {
      setVoteCount(newVoteCount);
    }
  }, [voteCountResult, voteCount]);

  //Update role after data of participants is received
  useEffect(() => {
    if (data?.meetingById?.participants && participantRole === null) {
      const participants = data?.meetingById?.participants as Array<Participant>;
      const participant = participants.filter((participant) => `auth0|${participant.user?.id}` === user?.sub)[0];
      setParticipantRole(participant.role);
    }
  }, [data?.meetingById, user?.sub, participantRole]);

  // set initial status of votation when data on votation arrives
  useEffect(() => {
    if (data?.votationById && status !== data.votationById.status) {
      if (data.votationById.status === 'PUBLISHED_RESULT') {
        refetchWinner();
      }
      setStatus(data.votationById.status);
    }
  }, [data, status, refetchWinner]);

  // update initial vote count when data arrives on votation
  useEffect(() => {
    if (data?.votationById?.hasVoted && data.votationById.hasVoted.length > voteCount) {
      setVoteCount(data.votationById.hasVoted.length);
    }
  }, [data, voteCount]);

  // update initial userHasVoted when data arrives on votation
  useEffect(() => {
    if (data?.votationById?.hasVoted && user?.sub) {
      setUserHasVoted(data.votationById.hasVoted.map((hasVoted) => `auth0|${hasVoted}`).includes(user?.sub));
    }
  }, [data, user]);

  // update status of votation when new data arrives on subscription
  // useEffect(() => {
  //   const newStatus = newStatusResult?.votationStatusUpdated ?? null;
  //   if (newStatus !== null && newStatus !== status) {
  //     setStatus(newStatus);
  //   }
  // }, [newStatusResult, status]);

  // // update vote count when new vote count arrives from subscription
  // useEffect(() => {
  //   if (!newVoteCountResult?.newVoteRegistered || newVoteCountResult.newVoteRegistered === voteCount) return;
  //   const newVoteCount = newVoteCountResult.newVoteRegistered;
  //   setVoteCount(newVoteCount);
  // }, [newVoteCountResult, voteCount]);

  //Handle selected Alternative
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  const handleSelect = (id: string | null) => setSelectedAlternativeId(id);

  //Register the vote
  const [castVote] = useCastVoteMutation();
  const submitVote = () => {
    if (selectedAlternativeId !== null) {
      setUserHasVoted(true);
      castVote({ variables: { alternativeId: selectedAlternativeId } });
    }
  };

  if (error?.message === 'Not Authorised!') {
    return (
      <>
        <Box h="57px" w="100vw" bgColor={darkblue}></Box>
        <Center mt="40vh">
          <Text>
            Du har ikke tilgang til denne voteringen,{' '}
            <Link href="/" textDecoration="underline">
              gå tilbake til hjemmesiden.
            </Link>
          </Text>
        </Center>
      </>
    );
  }

  if (loading || voteCountLoading) {
    return (
      <>
        <Box h="57px" w="100vw" bgColor={darkblue}></Box>
        <Center mt="10vh">
          <Loading asOverlay={false} text={'Henter votering'} />
        </Center>
      </>
    );
  }

  if (error || data?.votationById?.id === undefined || voteCountError) {
    return (
      <>
        <Box h="57px" w="100vw" bgColor={darkblue}></Box>
        <Center mt="10vh">
          <Text>Det skjedde noe galt under innlastingen</Text>
        </Center>
      </>
    );
  }

  if (status === VotationStatus.Upcoming) {
    return (
      <>
        <Box h="57px" w="100vw" bgColor={darkblue}></Box>
        <Center mt="10vh">
          <Text>Denne voteringen har ikke åpnet enda, men vil dukke opp her automatisk så fort den åpner.</Text>
        </Center>
      </>
    );
  }

  return (
    <Box>
      <Box pb="3em" w="80vw" maxW="max-content" m="auto" color={darkblue} mt="8vh">
        <Heading as="h1" sx={h1Style}>
          <span style={subtitlesStyle}>Votering {data.votationById.index}</span> <br />
          {data.votationById.title}
        </Heading>

        <Text mt="1em" mb="2em">
          {data.votationById.description}
        </Text>

        {status === VotationStatus.Open && (
          <Box>
            {!userHasVoted ? (
              <VStack spacing="1.5em" align="left">
                <Heading as="h2" sx={subtitlesStyle}>
                  Alternativer
                </Heading>
                <AlternativeList
                  alternatives={(data.votationById.alternatives as Array<AlternativeType>) || []}
                  handleSelect={handleSelect}
                  blankVotes={data.votationById.blankVotes || false}
                />
              </VStack>
            ) : (
              <Box mt="4em">
                <Loading asOverlay={false} text={'Votering pågår'} />
              </Box>
            )}

            <Divider m="3em 0" />

            {/* Submit button */}
            <Center>
              {!userHasVoted ? (
                <Button
                  onClick={() => submitVote()}
                  p="1.5em 4em"
                  borderRadius="16em"
                  isDisabled={selectedAlternativeId === null}
                >
                  Avgi Stemme
                </Button>
              ) : (
                <Heading as="h1" sx={h1Style}>
                  Din stemme er registrert.
                </Heading>
              )}
            </Center>

            {/* Shows how many participants has voted */}
            <VStack mt="3em" spacing="0">
              <Center>
                <Text fontSize="2.25em" fontWeight="bold">
                  {`${voteCount} / ${voteCountResult?.getVoteCount?.votingEligibleCount}`}
                </Text>
              </Center>
              <Center>
                <Heading as="h2" sx={subtitlesStyle}>
                  stemmer
                </Heading>
              </Center>
            </VStack>
          </Box>
        )}
        {status === 'CHECKING_RESULT' && participantRole === Role.Participant && (
          <Box>
            <Loading asOverlay={false} text={'Resultatene sjekkes'} />
          </Box>
        )}
        {status === 'CHECKING_RESULT' && (participantRole === Role.Counter || participantRole === Role.Admin) && (
          <CheckResults votationId={votationId} meetingId={meetingId} />
        )}
        {status === 'PUBLISHED_RESULT' && winner && (
          <Box mt="4em">
            <VotationResult text={winner.text} />
          </Box>
        )}
        {
          /* Update votation status for admin if votation is open or you are checking results */
          participantRole === Role.Admin &&
            (status === VotationStatus.Open || status === VotationStatus.CheckingResult) && (
              <VotationController votationId={votationId} status={status} />
            )
        }
      </Box>
    </Box>
  );
};

export default Votation;
