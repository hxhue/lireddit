import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { Box, IconButton, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import { useDeletePostMutation } from "../generated/graphql";

interface EditDeletePostButtonsProps {
  postId: number,
}

const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({postId}) => {
  const [, deletePost] = useDeletePostMutation();
  return (
    <Box ml="auto">
      <NextLink href="post/edit/[id]" as={`post/edit/${postId}`}>
        <IconButton
          as={Link}
          ml="auto"
          aria-label="Edit post"
          variant="ghost"
          icon={<EditIcon />}
        ></IconButton>
      </NextLink>
      <IconButton
        colorScheme={"red"}
        ml="auto"
        aria-label="Delete post"
        variant="ghost"
        icon={<DeleteIcon />}
        onClick={() => {
          deletePost({ id: postId });
        }}
      ></IconButton>
    </Box>
  );
};

export default EditDeletePostButtons;
