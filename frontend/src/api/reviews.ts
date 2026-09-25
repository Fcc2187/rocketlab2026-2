import { request } from './client'
import type { ReviewCreate, ReviewCreated, ReviewPage } from './types'

export const listReviews = (id: string, page: number, signal?: AbortSignal) =>
  request<ReviewPage>(`/movies/${encodeURIComponent(id)}/reviews?page=${page}&page_size=4`, { signal })

export const createReview = (id: string, payload: ReviewCreate) =>
  request<ReviewCreated>(`/movies/${encodeURIComponent(id)}/reviews`, {
    method: 'POST', body: JSON.stringify(payload),
  })
