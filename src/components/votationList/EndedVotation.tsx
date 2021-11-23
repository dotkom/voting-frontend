import React, { useEffect, useRef, useState } from 'react';
import { Box, HStack, Text, Tooltip } from '@chakra-ui/react';
import { collapsedStyle, highlightedStyle } from '../styles/formStyles';
import { Votation } from '../../types/types';
import { Role, VotationStatus } from '../../__generated__/graphql-types';
import CustomTag from '../common/CustomTag';
import DuplicateVotation from './DuplicateVotation';
import Hammer from '../../static/hammer.svg';
import useScreenWidth from '../../hooks/ScreenWidth';

export interface EndedVotationProps {
  votation: Votation;
  duplicateVotation: (votation: Votation) => void;
  role: Role | undefined;
  onClick: () => void;
}

const EndedVotation: React.FC<EndedVotationProps> = ({ votation, duplicateVotation, role, onClick }) => {
  const [isOverflown, setIsOverflown] = useState(false);
  const screenWidth = useScreenWidth();
  const ref = useRef<HTMLDivElement>(null);

  const winners = votation.alternatives.filter((a) => a.isWinner);
  const numberOfWinners = winners.length;
  const winnerString =
    numberOfWinners > 0
      ? winners.map(
          (a, index) => `${a.text}${index < winners.length - 2 ? ', ' : index === winners.length - 2 ? ' og ' : ''}`
        )
      : 'Ingen vinner';

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    setIsOverflown(element.scrollWidth > element.clientWidth);
  }, [ref]);

  const styles = {
    ...collapsedStyle,
    padding: 0,
    paddingLeft: '1.25em',
    marginBottom: '1.5em',
  };

  return (
    <Box key={votation.id} onClick={onClick} w="90vw" maxW="800px" h="56px" sx={styles}>
      <HStack
        justifyContent="space-between"
        _hover={
          (role === Role.Admin || role === Role.Counter) && votation.status === VotationStatus.PublishedResult
            ? { cursor: 'pointer' }
            : {}
        }
        pr={role !== Role.Admin ? '1.5em' : '0'}
      >
        <HStack w="100%" justifyContent="space-between" bgColor="rgba(255, 255, 255, 0.5)">
          <HStack spacing="8" opacity="0.5">
            <Text sx={highlightedStyle}>{`${votation.index + 1}`}</Text>
            <Text>{votation.title}</Text>
          </HStack>
          <HStack ml="auto">
            {votation.status === VotationStatus.PublishedResult && (
              <HStack opacity="0.5">
                <img alt="hammer" style={{ width: '24px', padding: '1em 0' }} src={Hammer} />
                <Tooltip label={winnerString} isDisabled={!isOverflown}>
                  <Text isTruncated ref={ref} maxWidth={screenWidth > 500 ? '200px' : `${screenWidth - 300}px`}>
                    {winnerString}
                  </Text>
                </Tooltip>
              </HStack>
            )}
            {votation.status === VotationStatus.Invalid && <CustomTag bgColor="#b5bfca" text="Avbrutt" />}
          </HStack>
        </HStack>
        {role === Role.Admin && (
          <Box opacity="0.5" _hover={{ opacity: 1 }}>
            <DuplicateVotation handleDuplicateVotation={() => duplicateVotation(votation)} />
          </Box>
        )}
      </HStack>
    </Box>
  );
};

export default EndedVotation;
