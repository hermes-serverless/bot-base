#include <stdio.h>

int main() {
  char c;
  int n;

  scanf(" %c %d", &c, &n);
  for (int i = 0; i < n; i++) {
    printf("%c", c);
  }
  
  return 0;
}