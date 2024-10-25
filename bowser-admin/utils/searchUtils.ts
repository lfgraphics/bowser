export async function searchItems<T>(
    url: string,
    searchTerm: string,
    errorMessage: string
  ): Promise<T[]> {
    try {
      const response = await fetch(`${url}/${searchTerm}`);
  
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(errorMessage);
        }
        throw new Error('Server error');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }