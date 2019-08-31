#include <stdio.h>
#include <thread>
#include <chrono>

int main() {
  char c[100];

  scanf("%s", c);
  std::this_thread::sleep_for(std::chrono::milliseconds(10 * 1000));
  printf("%s", c);

  return 0;
}