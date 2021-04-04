import React from 'react';
import { Button } from '@chakra-ui/react';
import { useCastVoteMutation } from '../../__generated__/graphql-types';

const UseMutationExample: React.FC = () => {
  // CAST_VOTE require the authenticated user to be particant that is eligible to vote of the votation.
  const [castVote, result] = useCastVoteMutation();

  if (result.loading) console.log('loading');
  if (result.error) console.log(result.error);

  const votationId = 'eea0eae0-407d-4036-ba9a-4e1ebff3f39f';
  const alternativeId = '1f5a993a-57de-48c7-a7b0-898074a77fed';

  console.log(result.data);
  return (
    <Button onClick={() => castVote({ variables: { votationId, alternativeId } })} colorScheme="blue">
      Avgi stemme
    </Button>
  );
};

export default UseMutationExample;
