import logging

import fastapi
from fastapi import APIRouter, Depends, Query, Request, status

from ..auth.auth import api_key_auth, get_current_user
from ..data.database import get_db_client
from ..helper.columns import TAGS_COLUMNS
from ..helper.rate_limiter import RATE_LIMITS, limiter
from ..schemas.base import TagData
from ..schemas.requests import TagRequest, TagUpdateRequest
from ..schemas.responses import TagsResponse, TagSuccessResponse

logger = logging.getLogger(__name__)

router = APIRouter()

#? This router prefix is /tags


@router.get("/", response_model=TagsResponse)
@limiter.limit(RATE_LIMITS["read_only"])
async def get_tags(
    request: Request,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
    tag_id: int | None = Query(None, description="Filter by tag ID"),
) -> TagsResponse:
    """Get all tags for the current user."""
    try:
        client = get_db_client(user["access_token"])

        fields = ",".join([
            TAGS_COLUMNS.ID.value,
            TAGS_COLUMNS.NAME.value,
            TAGS_COLUMNS.CREATED_AT.value,
        ])
        query = client.table("dim_tags").select(fields).order(TAGS_COLUMNS.NAME.value)

        if tag_id:
            query = query.eq(TAGS_COLUMNS.ID.value, tag_id)

        response = query.execute()

        return TagsResponse(
            data=[TagData(**item) for item in response.data],
            count=len(response.data),
            success=True,
            message="Tags retrieved successfully",
        )

    except Exception as e:
        logger.error(f"Failed to fetch tags: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tags",
        )


@router.post("/", response_model=TagSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def create_tag(
    request: Request,
    tag: TagRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> TagSuccessResponse:
    """Create a new tag."""
    try:
        client = get_db_client(user["access_token"])

        data = {
            TAGS_COLUMNS.NAME.value: tag.tag_name,
            TAGS_COLUMNS.USER_ID.value: user["user_id"],
        }
        response = client.table("dim_tags").insert(data).execute()

        return TagSuccessResponse(
            success=True,
            message="Tag created successfully",
            data=[TagData(**item) for item in response.data] if response.data else None,
        )

    except Exception as e:
        logger.error(f"Failed to create tag: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tag",
        )


@router.put("/{tag_id}", response_model=TagSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def update_tag(
    request: Request,
    tag_id: int,
    tag: TagUpdateRequest,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> TagSuccessResponse:
    """Rename a tag."""
    try:
        client = get_db_client(user["access_token"])

        data = {TAGS_COLUMNS.NAME.value: tag.tag_name}
        response = (
            client.table("dim_tags")
            .update(data)
            .eq(TAGS_COLUMNS.ID.value, tag_id)
            .execute()
        )

        return TagSuccessResponse(
            success=True,
            message=f"Tag {tag_id} updated successfully",
            data=[TagData(**item) for item in response.data] if response.data else None,
        )

    except Exception as e:
        logger.error(f"Failed to update tag {tag_id}: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tag",
        )


@router.delete("/{tag_id}", response_model=TagSuccessResponse)
@limiter.limit(RATE_LIMITS["write"])
async def delete_tag(
    request: Request,
    tag_id: int,
    api_key: str = Depends(api_key_auth),
    user: dict[str, str] = Depends(get_current_user),
) -> TagSuccessResponse:
    """Delete a tag. Junction rows cascade automatically."""
    try:
        client = get_db_client(user["access_token"])

        client.table("dim_tags").delete().eq(TAGS_COLUMNS.ID.value, tag_id).execute()

        return TagSuccessResponse(
            success=True,
            message=f"Tag {tag_id} deleted successfully",
            data=None,
        )

    except Exception as e:
        logger.error(f"Failed to delete tag {tag_id}: {str(e)}")
        raise fastapi.HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tag",
        )
