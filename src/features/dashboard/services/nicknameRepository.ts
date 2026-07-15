export type NicknameRpcClient = {
  rpc(
    functionName: "update_my_nickname",
    parameters: { p_nickname: string },
  ): PromiseLike<{ error: { message: string } | null }>;
};

export type NicknameRepository = {
  updateNickname(nickname: string): Promise<void>;
};

export function createNicknameRepository(
  client: NicknameRpcClient,
): NicknameRepository {
  return {
    async updateNickname(nickname) {
      const response = await client.rpc("update_my_nickname", {
        p_nickname: nickname,
      });

      if (response.error) {
        throw new Error(`Unable to update nickname: ${response.error.message}`);
      }
    },
  };
}
