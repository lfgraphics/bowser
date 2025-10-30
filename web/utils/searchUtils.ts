export async function searchItems<T>({
  url,
  searchTerm,
  errorMessage
}: {
  url: string;
  searchTerm?: string;
  errorMessage?: string;
}): Promise<T[]> {
  try {
    const response = await fetch(`${url}${searchTerm !== undefined ? "/" + searchTerm : ""}`);

    if (!response.ok) {
      try {
        const { message } = await response.json();
        throw new Error(message || (response.status === 404 ? errorMessage : 'Server error'));
      } catch {
        if (response.status === 404) throw new Error(errorMessage);
        throw new Error('Server error');
      }
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}