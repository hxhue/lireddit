import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Box, Heading } from "@chakra-ui/react";
import React, { useState } from "react";
import {
  PostNoTextFragment,
  useVoteMutation,
} from "../generated/graphql";

interface UpdootSectionProps {
  // post: PostsQuery["posts"]["posts"][0];
  post: PostNoTextFragment; // better way
  myvote: number; // Weak constraint, although we know that it should be 0 | -1 | 1.
}

export const UpdootSection: React.FC<UpdootSectionProps> = ({
  post,
  myvote,
}) => {
  const [, vote] = useVoteMutation();
  const [upvoting, setUpvoting] = useState(false);
  const [downvoting, setDownvoting] = useState(false);

  const iconFontSize = '24px'
  const iconDefaultVariant = 'ghost'

  return (
    <Flex direction="column" alignItems="center">
      <IconButton
        variant={myvote > 0 ? "solid" : iconDefaultVariant}
        colorScheme={myvote > 0 ? "green" : undefined}
        fontSize={iconFontSize}
        onClick={async () => {
          setUpvoting(true);
          await vote({
            postId: post.id,
            value: myvote <= 0 ? 1 : 0, // upvote / cancel upvote
          });
          setUpvoting(false);
        }}
        icon={<ChevronUpIcon />}
        aria-label={"Upvote"}
        isLoading={upvoting}
      ></IconButton>
      <Box m={1}>{post.points}</Box>
      <IconButton
        variant={myvote < 0 ? "solid" : iconDefaultVariant}
        colorScheme={myvote < 0 ? "red" : undefined}
        fontSize={iconFontSize}
        onClick={async () => {
          setDownvoting(true);
          await vote({
            postId: post.id,
            value: myvote >= 0 ? -1 : 0,
          });
          setDownvoting(false);
        }}
        icon={<ChevronDownIcon />}
        aria-label={"Downvote"}
        isLoading={downvoting}
      ></IconButton>
    </Flex>
  );
};

export default UpdootSection;
