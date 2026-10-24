"""Command-line interface for IIT KGP AI Assistant."""

import asyncio
from kgp_student_assistant.agent.kitchen import create_my_agent


async def main():
    agent = await create_my_agent()
    config = {
        "configurable": {
            "thread_id": "local-dev"
        }
    }
    print("\nIIT KGP Student Assistant")
    print("Type 'exit' to quit.\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            break
        if not user_input:
            continue
        try:
            response = await agent.ainvoke(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": user_input
                        }
                    ]
                },
                config=config,
            )
            print(
                "\nDucKGP:",
                response["messages"][-1].content,
                "\n"
            )
        except Exception as exc:
            print(f"\nRequest failed: {type(exc).__name__}\n")


if __name__ == "__main__":
    asyncio.run(main())